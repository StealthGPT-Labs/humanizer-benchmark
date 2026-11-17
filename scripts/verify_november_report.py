#!/usr/bin/env python3
"""Verify November's public data and arithmetic without humanized text.

This is a public-results verifier, not the private quality evaluator. It does
not contact any provider and does not establish vendor authenticity.
"""
from __future__ import annotations

import argparse
import collections
import csv
import hashlib
import json
import math
import re
import statistics
from pathlib import Path

REPORT_ID = '2026-11-17-humanizer-comparison'
HUMANIZERS = {
    'stealth', 'phrasly', 'writehuman', 'rephrasy', 'undetectableai',
    'hix', 'humbot', 'bypassgpt', 'grubby', 'rewriteai', 'zerogpt-humanizer',
    'grammarly-pro', 'quillbot', 'solvely', 'clever',
}
DETECTOR_WEIGHTS = {'pangram': 40, 'gptzero': 30, 'originality': 20, 'winston': 5, 'zerogpt': 5}
QUALITY_WEIGHTS = {
    'meaning': 20, 'factual_consistency': 10, 'hallucination_free': 5,
    'completeness': 10, 'stance_preservation': 5, 'readability': 25,
    'grammar_syntax': 10, 'structure': 15,
}
SCORE_COLUMNS = [
    'sample_id', 'humanizer', 'mode', 'input_words', 'output_words',
    'input_sha256', 'output_sha256', 'meaning', 'readability', 'structure',
    'factual_consistency', 'hallucination_free', 'grammar_syntax',
    'completeness', 'stance_preservation', 'evidence_review_required',
    'gptzero_human_score', 'gptzero_predicted_class', 'gptzero_version',
    'pangram_human_score', 'pangram_prediction', 'pangram_version',
    'originality_human_score', 'originality_prediction_label', 'originality_model',
    'winston_human_score', 'winston_version', 'zerogpt_human_score',
    'zerogpt_feedback', 'weighted_bypass_score', 'provisional_quality_score',
    'overall_effectiveness_score',
]
SOURCE_COLUMNS = [
    'sample_id', 'source_model', 'source_provider', 'category', 'genre',
    'topic', 'prompt', 'words', 'sha256', 'text', 'generated_at', 'returned_model',
]
COMMITMENT_COLUMNS = ['sample_id', 'humanizer', 'input_words', 'output_words', 'input_sha256', 'output_sha256']
HASH = re.compile(r'^[0-9a-f]{64}$')
SOURCE_MODELS = {'openai/gpt-6.1-sol', 'anthropic/claude-sonnet-5.5', 'google/gemini-4-argon', 'x-ai/grok-4.7', 'deepseek/deepseek-v4.1-flash'}


def require(condition: bool, message: str) -> None:
    if not condition:
        raise ValueError(message)


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def load_json(path: Path) -> dict:
    def invalid(value: str):
        raise ValueError(f'{path.name}: invalid numeric constant {value}')
    value = json.loads(path.read_text(encoding='utf-8'), parse_constant=invalid)
    require(isinstance(value, dict), f'{path.name}: expected JSON object')
    return value


def check_public_json(value, location: str) -> None:
    forbidden = {'input_text', 'output_text', 'anonymous_id', 'prompt', 'prompts', 'schemas_and_prompts', 'upstream_commit', 'grammar_pass_rule', 'quality_protocol', 'model_routing', 'judge_model'}
    if isinstance(value, dict):
        for key, child in value.items():
            require(key.lower() not in forbidden, f'{location}: private evaluation field is not allowed')
            require(not re.search(r'api.?key|password|secret|account|credit|balance|request_id|response_id', key, re.I), f'{location}: account/credential field is not allowed')
            check_public_json(child, location)
    elif isinstance(value, list):
        for child in value:
            check_public_json(child, location)
    elif isinstance(value, str):
        require('/Users/' not in value and 'C:\\Users\\' not in value, f'{location}: private local path is not allowed')


def load_csv(path: Path, columns: list[str]) -> list[dict[str, str]]:
    with path.open(encoding='utf-8-sig', newline='') as handle:
        reader = csv.DictReader(handle)
        require(reader.fieldnames == columns, f'{path.name}: unexpected public CSV schema')
        rows = list(reader)
    require(all(None not in row and all(v is not None for v in row.values()) for row in rows), f'{path.name}: malformed CSV row')
    return rows


def number(value: str, label: str) -> float:
    try:
        result = float(value)
    except (ValueError, TypeError):
        raise ValueError(f'{label}: expected finite numeric score') from None
    require(math.isfinite(result) and 0 <= result <= 100, f'{label}: score outside 0–100')
    return result


def words(value: str, label: str) -> int:
    require(value.isdecimal() and int(value) > 0, f'{label}: invalid word count')
    return int(value)


def equal(actual, expected, label: str) -> None:
    if isinstance(expected, dict):
        require(isinstance(actual, dict) and set(actual) == set(expected), f'{label}: fields do not match')
        for key in expected:
            equal(actual[key], expected[key], f'{label}.{key}')
    elif isinstance(expected, list):
        require(isinstance(actual, list) and len(actual) == len(expected), f'{label}: list size does not match')
        for index, (a, e) in enumerate(zip(actual, expected)):
            equal(a, e, f'{label}[{index}]')
    elif isinstance(expected, (int, float)) and not isinstance(expected, bool):
        require(isinstance(actual, (int, float)) and not isinstance(actual, bool) and math.isfinite(actual) and math.isclose(actual, expected, rel_tol=0, abs_tol=1e-7), f'{label}: value does not match recomputed result')
    else:
        require(actual == expected, f'{label}: value does not match')


def strict_pass(row: dict[str, str], detector: str) -> bool:
    if detector == 'pangram':
        return row['pangram_prediction'] == 'Human'
    if detector == 'gptzero':
        return row['gptzero_predicted_class'] == 'human'
    if detector == 'originality':
        return row['originality_prediction_label'] == 'human'
    if detector == 'winston':
        return float(row['winston_human_score']) >= 80
    if detector == 'zerogpt':
        return row['zerogpt_feedback'] in {'Your Text is Human Written', 'Your Text is Most Likely Human written'}
    raise ValueError('Unknown detector')


def verify_report(report_dir: Path) -> dict:
    require(report_dir.is_dir(), 'Report directory does not exist')
    expected_files = {
        'README.md', 'assets/bypass-vs-quality.png', 'data/scores.csv',
        'data/source-texts.csv', 'data/summary.json', 'data/output-commitments.csv',
        'data/methodology.json', 'data/provenance.json',
        *(f'data/humanizers/{humanizer}.csv' for humanizer in HUMANIZERS),
    }
    entries = list(report_dir.rglob('*'))
    require(not any(path.is_symlink() for path in entries), 'Symlinks are not allowed in a public release')
    actual_files = {path.relative_to(report_dir).as_posix() for path in entries if path.is_file()}
    require(actual_files == expected_files | {'manifest.json'}, 'Unexpected or missing report files; refuse possible private artifacts')
    manifest = load_json(report_dir/'manifest.json')
    require(manifest.get('report_id') == REPORT_ID and manifest.get('hash_algorithm') == 'SHA-256', 'Manifest identity/algorithm does not match')
    require(manifest.get('humanized_output_text_published') is False, 'Public release must withhold humanized text')
    actual_hashes = {name: sha256(report_dir/name) for name in sorted(expected_files)}
    equal(manifest.get('files'), actual_hashes, 'manifest.files')
    tree_hash = hashlib.sha256(''.join(f'{name}\0{digest}\n' for name, digest in sorted(actual_hashes.items())).encode('utf-8')).hexdigest()
    equal(manifest.get('file_tree_sha256'), tree_hash, 'manifest.file_tree_sha256')
    for path in sorted(report_dir.rglob('*.json')):
        check_public_json(load_json(path), path.name)
    summary = load_json(report_dir/'data/summary.json')
    policy = load_json(report_dir/'data/methodology.json')
    provenance = load_json(report_dir/'data/provenance.json')
    require(summary.get('schema_version') == '2.0' and summary.get('report_id') == REPORT_ID, 'Summary schema or report identity mismatch')
    equal(summary.get('benchmark_date'), '2026-11-17', 'benchmark date')
    equal(summary.get('outputs'), 750, 'output count')
    equal(summary.get('detector_scans'), 3750, 'detector scan count')
    equal(summary['scoring']['bypass_detector_weights_percent'], DETECTOR_WEIGHTS, 'detector weights')
    equal(summary['scoring']['quality_weights_percent'], QUALITY_WEIGHTS, 'quality weights')
    equal(summary['scoring']['overall_weights_percent'], {'humanization':70, 'quality':30}, 'overall weights')
    equal(policy.get('bypass_detector_weights_percent'), DETECTOR_WEIGHTS, 'policy detector weights')
    equal(policy.get('quality_weights_percent'), QUALITY_WEIGHTS, 'policy quality weights')
    equal(policy.get('humanization_weight_percent'), 70, 'policy humanization weight')
    equal(policy.get('quality_weight_percent'), 30, 'policy quality weight')
    require('provisional' in summary.get('quality_status', ''), 'Automated quality must retain provisional status')

    source_rows = load_csv(report_dir/'data/source-texts.csv', SOURCE_COLUMNS)
    sample_ids = [f'sample_{index:03d}' for index in range(1,51)]
    equal([r['sample_id'] for r in source_rows], sample_ids, 'source sample coverage')
    sources = {r['sample_id']:r for r in source_rows}
    model_counts = collections.Counter(r['source_model'] for r in source_rows)
    equal(dict(model_counts), {model:10 for model in SOURCE_MODELS}, 'five-model source balance')
    for row in source_rows:
        require(HASH.fullmatch(row['sha256']) is not None, 'Invalid source commitment')
        equal(hashlib.sha256(row['text'].encode('utf-8')).hexdigest(), row['sha256'], 'source text hash')
        equal(len(row['text'].split()), words(row['words'], 'source'), 'source word count')
        require(all(row[key] for key in ['prompt','category','genre','topic','returned_model']), 'Missing source-generation metadata')
    equal(summary['sample']['size'], 50, 'sample size')
    equal(summary['sample']['source_models'], [{'model':model,'texts':count} for model,count in sorted(model_counts.items())], 'source model summary')
    equal(summary['sample']['input_words_per_humanizer'], sum(int(r['words']) for r in source_rows), 'source word total')

    rows = load_csv(report_dir/'data/scores.csv', SCORE_COLUMNS)
    require(len(rows) == 750, 'Expected exactly 750 public output rows')
    keys = [(r['humanizer'],r['sample_id']) for r in rows]
    require(len(set(keys)) == 750, 'Duplicated humanizer/sample pair')
    require(set(keys) == {(provider,sample) for provider in HUMANIZERS for sample in sample_ids}, 'Missing or unknown humanizer/sample pair')
    require(len({r['output_sha256'] for r in rows}) == 750, 'Output commitment count does not match the frozen edition')
    for row in rows:
        source = sources[row['sample_id']]
        require(HASH.fullmatch(row['output_sha256']) is not None, 'Invalid output commitment')
        equal(row['input_sha256'], source['sha256'], 'same frozen input for all humanizers')
        equal(words(row['input_words'], 'input'), int(source['words']), 'frozen input word count')
        words(row['output_words'], 'output')
        require(row['evidence_review_required'] in {'True','False'}, 'Invalid evidence-review flag')
        require(bool(row['mode']) and len(row['mode']) < 300, 'Missing or invalid capture mode')
        require(row['pangram_prediction'] in {'Human','Mixed','AI'}, 'Invalid Pangram native classification')
        require(row['gptzero_predicted_class'] in {'human','mixed','ai'}, 'Invalid GPTZero native classification')
        require(row['originality_prediction_label'] in {'human','mixed','ai'}, 'Invalid Originality native classification')
        require(0 < len(row['zerogpt_feedback']) < 500, 'Missing ZeroGPT feedback')
        for detector in DETECTOR_WEIGHTS:
            number(row[detector+'_human_score'], detector)
        bypass = sum(weight * strict_pass(row, detector) for detector,weight in DETECTOR_WEIGHTS.items())
        quality = sum(number(row[metric], metric)*weight/100 for metric,weight in QUALITY_WEIGHTS.items())
        equal(number(row['weighted_bypass_score'], 'bypass'), bypass, 'per-output bypass composite')
        equal(number(row['provisional_quality_score'], 'quality'), quality, 'per-output quality composite')
        equal(number(row['overall_effectiveness_score'], 'overall'), .7*bypass+.3*quality, 'per-output overall composite')

    version_fields = {'pangram':'pangram_version','gptzero':'gptzero_version','originality':'originality_model','winston':'winston_version'}
    detector_profiles = summary['detectors']
    require(len(detector_profiles) == 5 and {d['id'] for d in detector_profiles} == set(DETECTOR_WEIGHTS), 'Detector profile coverage mismatch')
    for detector in detector_profiles:
        detector_id = detector['id']
        equal(detector['weight_percent'], DETECTOR_WEIGHTS[detector_id], 'detector profile weight')
        equal(detector['pass_rule'], policy['strict_pass_rules'][detector_id], 'published detector pass rule')
        observed = sorted({row[version_fields[detector_id]] for row in rows}) if detector_id in version_fields else []
        equal(detector['observed_versions'], observed, 'observed detector versions')
        if observed:
            require(all(version and version in detector['version'] for version in observed), 'Detector display version does not match observed native version')
        else:
            require(detector_id == 'zerogpt' and 'unavailable' in detector['version'], 'Missing detector version must be disclosed')

    commitments = load_csv(report_dir/'data/output-commitments.csv', COMMITMENT_COLUMNS)
    equal(commitments, [{key:row[key] for key in COMMITMENT_COLUMNS} for row in rows], 'output commitments')
    profiles = summary['sample']['humanizers']
    require(len(profiles) == 15 and {p['id'] for p in profiles} == HUMANIZERS, 'Humanizer profile coverage mismatch')
    expected_results = []
    for profile in profiles:
        require(set(profile) == {'id','name','slug','url','settings','capture_mode_labels','collection_method'}, 'Unexpected humanizer metadata fields')
        cohort = sorted([r for r in rows if r['humanizer'] == profile['id']], key=lambda r:r['sample_id'])
        equal(profile['capture_mode_labels'], sorted({row['mode'] for row in cohort}), 'captured mode labels')
        equal(profile['collection_method'], 'web interface' if profile['id'] in {'grammarly-pro','quillbot','solvely','clever'} else 'API', 'collection method')
        equal(load_csv(report_dir/f"data/humanizers/{profile['id']}.csv", SCORE_COLUMNS), cohort, 'per-humanizer score slice')
        expected_results.append({
            'id':profile['id'], 'name':profile['name'], 'evaluated_outputs':50,
            'weighted_bypass_score':statistics.fmean(float(r['weighted_bypass_score']) for r in cohort),
            'quality_score':statistics.fmean(float(r['provisional_quality_score']) for r in cohort),
            'overall_effectiveness_score':statistics.fmean(float(r['overall_effectiveness_score']) for r in cohort),
            'median_overall_effectiveness_score':statistics.median(float(r['overall_effectiveness_score']) for r in cohort),
            'mean_length_ratio':statistics.fmean(int(r['output_words'])/int(r['input_words']) for r in cohort),
            'input_words':sum(int(r['input_words']) for r in cohort), 'output_words':sum(int(r['output_words']) for r in cohort),
            'quality_metrics':{metric:statistics.fmean(float(r[metric]) for r in cohort) for metric in QUALITY_WEIGHTS},
            'evidence_review_outputs':sum(r['evidence_review_required']=='True' for r in cohort),
            'detectors':{detector:{'strict_bypass_count':sum(strict_pass(r,detector) for r in cohort),'strict_bypass_rate_percent':2*sum(strict_pass(r,detector) for r in cohort),'mean_native_human_score':statistics.fmean(float(r[detector+'_human_score']) for r in cohort),'median_native_human_score':statistics.median(float(r[detector+'_human_score']) for r in cohort)} for detector in DETECTOR_WEIGHTS},
        })
    expected_results.sort(key=lambda r:-r['overall_effectiveness_score'])
    equal(summary['results'], expected_results, 'summary results')
    review_count = sum(r['evidence_review_required']=='True' for r in rows)
    equal(summary['evidence_review_outputs'], review_count, 'evidence-review total')
    equal(policy['evidence_review_outputs'], review_count, 'policy evidence-review total')
    source_hashes = {name:sha256(report_dir/'data'/name) for name in ['scores.csv','source-texts.csv','output-commitments.csv']}
    equal(summary['source_files'], source_hashes, 'summary source file commitments')
    equal(policy['published_file_hashes'], source_hashes, 'policy source file commitments')
    require(provenance['source_texts_verified'] == 50 and provenance['captured_output_pairs_verified'] == 750 and provenance['unique_output_hashes'] == 750, 'Provenance coverage mismatch')
    private = provenance['private_evidence_commitments']
    require(HASH.fullmatch(private['humanizer_capture_master_sha256']) is not None and HASH.fullmatch(private['scored_master_sha256']) is not None, 'Invalid private evidence commitment format')
    require(set(private['detector_tables']) == set(DETECTOR_WEIGHTS), 'Private detector commitment coverage mismatch')
    for evidence in private['detector_tables'].values():
        require(evidence['records_verified'] == 750 and HASH.fullmatch(evidence['file_sha256']) is not None, 'Invalid detector evidence commitment')
    return {'status':'verified','report_id':REPORT_ID,'frozen_inputs':50,'humanizers':15,'outputs':750,'detector_scores':3750,'evidence_review_outputs':review_count,'public_files':len(actual_files),'file_tree_sha256':tree_hash}


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('report_dir', type=Path)
    args = parser.parse_args()
    try:
        result = verify_report(args.report_dir)
    except (ValueError, KeyError, OSError, csv.Error) as error:
        parser.exit(1, f'Verification failed: {error}\n')
    print(json.dumps(result, indent=2))
    print('Verified public integrity and arithmetic; humanized text and private quality logic were not accessed.')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
