"""Source-only generation: explicit prepare/generate commands; no humanizer or detector calls."""
import argparse,concurrent.futures,csv,datetime,hashlib,json,pathlib,re,secrets,threading,urllib.request,urllib.error
ROOT=pathlib.Path(__file__).resolve().parents[1]
OUT=ROOT/'data/source-corpus-2026-11-16'
PRIVATE=ROOT/'private/source-corpus-2026-11-16'
def digest(b):return hashlib.sha256(b).hexdigest()
def select_topics(seed,format_name,bank):
 return sorted(set(bank),key=lambda t:(digest(('topic-v1\0'+seed+'\0'+format_name+'\0'+t).encode()),t))[:5]
def word_count(text):return len(text.split())
def validate_text(text,finish,seen):
 reasons=[]
 if not 500<=word_count(text)<=800:reasons.append('length')
 if finish!='stop':reasons.append('truncated')
 if digest(text.encode()) in seen:reasons.append('duplicate')
 if re.search(r"\b(I cannot|I can't|I'm unable|I am unable) (write|provide|assist|fulfill|comply)",text,re.I):reasons.append('refusal')
 return reasons

def read_key():
 for name in [ROOT/'console/.env.local',pathlib.Path('/Users/joe/Downloads/HumanizerEval-Missing-API-Keys.txt')]:
  if not name.exists():continue
  values={}
  for line in name.read_text().splitlines():
   if '=' in line:
    k,v=line.split('=',1);values[k.strip()]=v.strip().strip('\"\'')
  key=values.get('OPENROUTER_API_KEY') or values.get('AI_GATEWAY_API_KEY')
  if key:return key
 raise RuntimeError('OpenRouter credential missing')
def request(path,key,body=None):
 req=urllib.request.Request('https://openrouter.ai/api/v1/'+path,data=None if body is None else json.dumps(body).encode(),headers={'Authorization':'Bearer '+key,'Content-Type':'application/json','X-Title':'HumanizerEval source corpus'})
 with urllib.request.urlopen(req,timeout=180) as r:return json.load(r)
def prepare():
 PRIVATE.mkdir(parents=True,exist_ok=True)
 if (OUT/'commit.json').exists():raise RuntimeError('Commitment already exists')
 nonce=secrets.token_hex(32);(PRIVATE/'nonce.txt').write_text(nonce+'\n')
 paths=[OUT/x for x in ['banks.json','templates.json','generation-settings.json','sample-allocation.csv']]+[ROOT/'scripts/source_corpus.py']
 record={'created_at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'nonce_sha256':digest(bytes.fromhex(nonce)),'files':{str(p.relative_to(ROOT)):digest(p.read_bytes()) for p in paths},'stage':'Commit before topic selection and any paid model requests','selection':'SHA256 domain-separated topic-v1 ranks; assign-v1 separately orders providers per format; lexical tie-breaks'}
 (OUT/'commit.json').write_text(json.dumps(record,indent=2)+'\n')
 print('Commitment prepared; publish it before resolving prompts or generating text.',flush=True)
def generate():
 commit=json.loads((OUT/'commit.json').read_text())
 for p,h in commit['files'].items():
  if digest((ROOT/p).read_bytes())!=h:raise RuntimeError('Frozen artifact changed: '+p)
 nonce=(PRIVATE/'nonce.txt').read_text().strip()
 if digest(bytes.fromhex(nonce))!=commit['nonce_sha256']:raise RuntimeError('Nonce mismatch')
 settings=json.loads((OUT/'generation-settings.json').read_text());banks=json.loads((OUT/'banks.json').read_text());templates=json.loads((OUT/'templates.json').read_text())
 rows=list(csv.DictReader((OUT/'sample-allocation.csv').open()))
 assignments={}
 for fmt,bank in banks.items():
  topics=select_topics(nonce,fmt,bank)
  providers=sorted(settings['models'],key=lambda p:(digest(('assign-v1\0'+nonce+'\0'+fmt+'\0'+p).encode()),p))
  assignments[fmt]=dict(zip(providers,topics))
 for row in rows:
  row['topic']=assignments[row['format']][row['source_provider']]
  row['source_model']=settings['models'][row['source_provider']]
  row['prompt']=templates[row['format']].replace('[TOPIC]',row['topic']).replace('[FORMAT]',row['format'])
 (PRIVATE/'resolved-prompts.json').write_text(json.dumps(rows,indent=2)+'\n')
 key=read_key();catalog=request('models',key)['data'];available={x['id']:x for x in catalog}
 for model in settings['models'].values():
  if model not in available:raise RuntimeError('Unavailable model: '+model)
 account=request('credits',key);remaining=float(account['data']['total_credits'])-float(account['data']['total_usage'])
 print(json.dumps({'balance_usd':round(remaining,4),'models':settings['models']}),flush=True)
 if remaining<settings['budget_ceiling_usd']:raise RuntimeError('Balance below generation safety ceiling')
 lock=threading.Lock();seen=set();reserved=0.0;accepted={}
 def worker(row):
  nonlocal reserved
  sid=row['sample_id'];saved=PRIVATE/(sid+'.accepted.json')
  if saved.exists():
   result=json.loads(saved.read_text())
   with lock:seen.add(result['sha256']);accepted[sid]=result
   return
  for attempt in range(1,4):
   dest=PRIVATE/f'{sid}.attempt-{attempt}.json'
   if dest.exists():continue
   model=row['source_model'];pricing=available[model]['pricing']
   bound=4096*float(pricing['completion'])+len(row['prompt'].encode())*float(pricing['prompt'])
   with lock:
    if reserved+bound>settings['budget_ceiling_usd']:raise RuntimeError('Generation budget ceiling reached')
    reserved+=bound
   payload={'model':model,'messages':[{'role':'user','content':row['prompt']}],**settings['request']}
   started=datetime.datetime.now(datetime.timezone.utc).isoformat()
   try:
    response=request('chat/completions',key,payload)
    choice=response.get('choices',[{}])[0];text=(choice.get('message',{}).get('content') or '').strip();finish=choice.get('finish_reason')
    with lock:
     reasons=validate_text(text,finish,seen)
     if response.get('model')!=model:reasons.append('model_mismatch')
     if text and len(set(re.findall(r'\b(the|and|of|to|in|is|a|that|for|with)\b',text,re.I)))<4:reasons.append('language_review_needed')
     if response.get('error'):reasons.append('provider_error')
     if not reasons:seen.add(digest(text.encode()))
    record={'sample_id':sid,'attempt':attempt,'started_at':started,'request':payload,'response':response,'rejections':reasons}
    dest.write_text(json.dumps(record,ensure_ascii=False,indent=2)+'\n')
    if not reasons:
     result={**row,'words':word_count(text),'sha256':digest(text.encode()),'text':text,'generated_at':started,'returned_model':response.get('model'),'generation_id':response.get('id'),'usage':response.get('usage',{}),'attempt':attempt}
     saved.write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
     with lock:accepted[sid]=result
     print(json.dumps({'sample':sid,'model':model,'words':result['words'],'attempt':attempt,'cost':result['usage'].get('cost')}),flush=True);return
    print(json.dumps({'sample':sid,'attempt':attempt,'rejected':reasons}),flush=True)
   except (urllib.error.URLError,TimeoutError,ValueError) as e:
    dest.write_text(json.dumps({'sample_id':sid,'attempt':attempt,'started_at':started,'failure_type':type(e).__name__,'http_status':getattr(e,'code',None)})+'\n')
    print(json.dumps({'sample':sid,'attempt':attempt,'failure_type':type(e).__name__}),flush=True)
  raise RuntimeError(sid+': no accepted response after three attempts')
 failures=[]
 with concurrent.futures.ThreadPoolExecutor(max_workers=5) as pool:
  futures={pool.submit(worker,row):row['sample_id'] for row in rows}
  for f in concurrent.futures.as_completed(futures):
   try:f.result()
   except Exception as e:failures.append(str(e))
 if failures:raise RuntimeError('; '.join(failures))
 fields=['sample_id','source_model','source_provider','category','genre','topic','prompt','words','sha256','text','generated_at','returned_model']
 with (OUT/'source-texts.csv').open('w',newline='',encoding='utf-8-sig') as f:
  writer=csv.DictWriter(f,fieldnames=fields);writer.writeheader()
  for row in rows:
   r=accepted[row['sample_id']];writer.writerow({k:(r['format'] if k=='genre' else r[k]) for k in fields})
 manifest={'created_at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'sample_count':50,'input_words':sum(x['words'] for x in accepted.values()),'source_csv_sha256':digest((OUT/'source-texts.csv').read_bytes()),'inputs':{sid:r['sha256'] for sid,r in sorted(accepted.items())},'models':settings['models'],'stage':'Source corpus frozen. No humanizer or detector calls made.'}
 (OUT/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
 print(json.dumps(manifest),flush=True)
if __name__=='__main__':
 parser=argparse.ArgumentParser();parser.add_argument('command',choices=['prepare','generate']);args=parser.parse_args()
 if args.command=='prepare':prepare()
 else:generate()
