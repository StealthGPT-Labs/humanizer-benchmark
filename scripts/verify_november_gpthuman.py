#!/usr/bin/env python3
"""Verify the sanitized November 26 report with Python's standard library."""
from __future__ import annotations

import argparse
import csv
import hashlib
import json
import math
import statistics
from pathlib import Path

REPORT_ID = '2026-11-26-humanizer-comparison'
HUMANIZERS = {
    'phrasly', 'stealth', 'writehuman', 'rephrasy', 'undetectableai',
    'clever', 'zerogpt-humanizer', 'bypassgpt', 'grubby', 'grammarly-pro',
    'humbot', 'solvely', 'rewriteai', 'quillbot', 'hix', 'superhumanizer',
    'gpthuman',
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
COMMIT_COLUMNS = ['sample_id', 'humanizer', 'input_words', 'output_words', 'input_sha256', 'output_sha256']
DETECTOR_SCORE_FIELDS = {
    'pangram': 'pangram_human_score',
    'gptzero': 'gptzero_human_score',
    'originality': 'originality_human_score',
    'winston': 'winston_human_score',
    'zerogpt': 'zerogpt_human_score',
}
HASHES = set('0123456789abcdef')
BASELINE_BYTES = 322085
BASELINE_SHA = '2c097d8529edb30da5ad8ef7144d1da53a7ae63eaac445f95dd258c9d6868d0b'
ORIGINAL_750_BYTES = 301610
ORIGINAL_750_SHA = 'dfd2178b7d625683e77dc305ae5a5d70ce8065bb1a85e5a11380932ab0452c9b'


def require(condition: bool, message: str) -> None:
    if not condition:
        raise ValueError(message)


def sha_bytes(value: bytes) -> str:
    return hashlib.sha256(value).hexdigest()


def sha_file(path: Path) -> str:
    return sha_bytes(path.read_bytes())


def load_json(path: Path):
    def invalid(value: str):
        raise ValueError(f'{path.name}: invalid numeric constant {value}')
    return json.loads(path.read_text(encoding='utf-8'), parse_constant=invalid)


def read_csv(path: Path, fields: list[str]) -> list[dict[str, str]]:
    with path.open(encoding='utf-8-sig', newline='') as handle:
        reader = csv.DictReader(handle)
        require(reader.fieldnames == fields, f'{path.name}: unexpected CSV schema')
        rows = list(reader)
    require(all(None not in row and all(v is not None for v in row.values()) for row in rows), f'{path.name}: malformed row')
    return rows


def check_public_value(value, label: str) -> None:
    forbidden_keys = {'input_text', 'output_text', 'anonymous_id', 'judge_model', 'quality_protocol', 'schemas_and_prompts'}
    if isinstance(value, dict):
        for key, child in value.items():
            require(key.lower() not in forbidden_keys, f'{label}: private field {key} is not allowed')
            require(not any(word in key.lower() for word in ['api_key', 'password', 'secret', 'account_id', 'credits_remaining', 'balance']), f'{label}: private field {key} is not allowed')
            check_public_value(child, label)
    elif isinstance(value, list):
        for child in value:
            check_public_value(child, label)
    elif isinstance(value, str):
        require('/Users/' not in value and 'C:\\Users\\' not in value, f'{label}: local path is not allowed')


def number(value: str, label: str) -> float:
    result = float(value)
    require(math.isfinite(result) and 0 <= result <= 100, f'{label}: expected a finite score from 0 to 100')
    return result


def strict_pass(row: dict[str, str], detector: str) -> bool:
    if detector == 'pangram':
        return row['pangram_prediction'] == 'Human'
    if detector == 'gptzero':
        return row['gptzero_predicted_class'] == 'human'
    if detector == 'originality':
        return row['originality_prediction_label'] == 'human'
    if detector == 'winston':
        return float(row['winston_human_score']) >= 80
    return row['zerogpt_feedback'] in {'Your Text is Human Written', 'Your Text is Most Likely Human written'}


def close(actual, expected, label: str) -> None:
    require(math.isclose(float(actual), float(expected), rel_tol=0, abs_tol=1e-7), f'{label}: {actual} != {expected}')


def verify_report(root: Path) -> dict:
    require(root.is_dir(), 'Report folder does not exist')
    expected_files = {
        'README.md', 'assets/bypass-vs-quality.png',
        'data/scores.csv', 'data/source-texts.csv', 'data/output-commitments.csv',
        'data/summary.json', 'data/methodology.json', 'data/provenance.json',
        *(f'data/humanizers/{provider}.csv' for provider in HUMANIZERS),
    }
    actual = {p.relative_to(root).as_posix() for p in root.rglob('*') if p.is_file()}
    require(actual == expected_files | {'manifest.json'}, 'Report file set does not match its public allowlist')
    require(not any(p.is_symlink() for p in root.rglob('*')), 'Report contains a symbolic link')

    manifest = load_json(root / 'manifest.json')
    require(manifest.get('report_id') == REPORT_ID, 'Manifest report ID does not match')
    require(manifest.get('humanized_output_text_published') is False, 'Humanized output text must remain private')
    file_hashes = {name: sha_file(root / name) for name in sorted(expected_files)}
    require(manifest.get('files') == file_hashes, 'Manifest file hashes do not match')
    tree_hash = sha_bytes(''.join(f'{name}\0{digest}\n' for name, digest in sorted(file_hashes.items())).encode())
    require(manifest.get('file_tree_sha256') == tree_hash, 'Manifest tree hash does not match')

    for path in root.rglob('*.json'):
        check_public_value(load_json(path), path.name)
    summary = load_json(root / 'data/summary.json')
    policy = load_json(root / 'data/methodology.json')
    provenance = load_json(root / 'data/provenance.json')
    require(summary.get('schema_version') == '2.0' and summary.get('report_id') == REPORT_ID, 'Summary identity/schema mismatch')
    require(summary.get('benchmark_date') == '2026-11-26', 'Unexpected benchmark date')
    require(summary.get('outputs') == 850 and summary.get('detector_scans') == 4250, 'Expected 850 outputs and 4,250 detector scores')
    require(summary.get('evidence_review_outputs') == 672, 'Evidence-review count does not match')
    require(summary['scoring']['bypass_detector_weights_percent'] == DETECTOR_WEIGHTS, 'Detector weights changed')
    require(summary['scoring']['quality_weights_percent'] == QUALITY_WEIGHTS, 'Quality weights changed')
    require(summary['scoring']['overall_weights_percent'] == {'humanization': 70, 'quality': 30}, 'Overall weights changed')
    require('provisional' in summary.get('quality_status', '').lower(), 'Automated quality must remain provisional')
    require(policy.get('rows') == 850 and policy.get('humanizers') == 17, 'Methodology coverage does not match')
    require(policy.get('quality_weights_percent') == QUALITY_WEIGHTS, 'Methodology quality weights changed')

    continuation = summary['continuation']
    require(continuation['prior_outputs_unchanged'] == 800 and continuation['original_scores_rerun'] is False, 'Prior 800 results are not marked unchanged')
    require(continuation['baseline_scores_prefix_bytes'] == BASELINE_BYTES and continuation['baseline_scores_sha256'] == BASELINE_SHA, 'Previous public 800-row score commitment changed')
    old750 = continuation['original_750']
    require(old750['scores_prefix_bytes'] == ORIGINAL_750_BYTES and old750['scores_prefix_sha256'] == ORIGINAL_750_SHA, 'Original 750-row commitment changed')
    score_bytes = (root / 'data/scores.csv').read_bytes()
    require(len(score_bytes) > BASELINE_BYTES, 'New output rows are not appended')
    require(sha_bytes(score_bytes[:BASELINE_BYTES]) == BASELINE_SHA, 'Previous 800 score rows changed')
    require(sha_bytes(score_bytes[:ORIGINAL_750_BYTES]) == ORIGINAL_750_SHA, 'Original 750 score rows changed')

    sources = read_csv(root / 'data/source-texts.csv', SOURCE_COLUMNS)
    sample_ids = [f'sample_{n:03}' for n in range(1, 51)]
    require([r['sample_id'] for r in sources] == sample_ids, 'Source sample IDs are incomplete or out of order')
    source_by_id = {r['sample_id']: r for r in sources}
    for row in sources:
        require(sha_bytes(row['text'].encode('utf-8')) == row['sha256'], 'Source text hash mismatch')
        require(len(row['text'].split()) == int(row['words']), 'Source word count mismatch')

    rows = read_csv(root / 'data/scores.csv', SCORE_COLUMNS)
    require(len(rows) == 850, 'Expected exactly 850 public score rows')
    keys = [(r['humanizer'], r['sample_id']) for r in rows]
    require(len(set(keys)) == 850, 'Duplicate humanizer/sample pair')
    expected_keys = {(provider, sample) for provider in HUMANIZERS for sample in sample_ids}
    require(set(keys) == expected_keys, 'Humanizer/sample coverage differs from the expected 17 × 50')
    require(len({r['output_sha256'] for r in rows}) == 850, 'Output hash commitments are not unique')

    by_provider: dict[str, list[dict[str, str]]] = {provider: [] for provider in HUMANIZERS}
    for row in rows:
        by_provider[row['humanizer']].append(row)
        source = source_by_id[row['sample_id']]
        require(row['input_sha256'] == source['sha256'], 'A humanizer did not receive the frozen input')
        require(int(row['input_words']) == int(source['words']), 'Input word count mismatch')
        require(int(row['output_words']) > 0, 'Invalid output word count')
        require(row['evidence_review_required'] in {'True', 'False'}, 'Invalid evidence-review flag')
        require(0 < len(row['mode']) < 300, 'Missing recorded setting')
        require(row['pangram_prediction'] in {'Human', 'Mixed', 'AI'}, 'Invalid Pangram verdict')
        require(row['gptzero_predicted_class'] in {'human', 'mixed', 'ai'}, 'Invalid GPTZero verdict')
        require(row['originality_prediction_label'] in {'human', 'mixed', 'ai'}, 'Invalid Originality verdict')
        for detector, field in DETECTOR_SCORE_FIELDS.items():
            number(row[field], detector)
        bypass = sum(weight * strict_pass(row, detector) for detector, weight in DETECTOR_WEIGHTS.items())
        quality = sum(number(row[metric], metric) * weight / 100 for metric, weight in QUALITY_WEIGHTS.items())
        close(row['weighted_bypass_score'], bypass, 'weighted bypass score')
        close(row['provisional_quality_score'], quality, 'provisional quality score')
        close(row['overall_effectiveness_score'], 0.7 * bypass + 0.3 * quality, 'overall score')

    commitments = read_csv(root / 'data/output-commitments.csv', COMMIT_COLUMNS)
    require(commitments == [{k: r[k] for k in COMMIT_COLUMNS} for r in rows], 'Output commitments do not match score rows')
    profiles = summary['sample']['humanizers']
    require(len(profiles) == 17 and {p['id'] for p in profiles} == HUMANIZERS, 'Summary profile roster mismatch')
    results_by_id = {r['id']: r for r in summary['results']}
    require(len(results_by_id) == 17, 'Summary result roster mismatch')
    for profile in profiles:
        provider = profile['id']
        cohort = by_provider[provider]
        require(len(cohort) == 50, f'{provider}: expected 50 outputs')
        require(set(profile) == {'id', 'name', 'slug', 'url', 'settings', 'collection_method', 'capture_mode_labels'}, 'Unexpected public profile fields')
        require(profile['capture_mode_labels'] == sorted({r['mode'] for r in cohort}), f'{provider}: mode labels differ')
        require(profile['collection_method'] == ('web interface' if provider in {'grammarly-pro', 'quillbot', 'solvely', 'clever', 'gpthuman'} else 'API'), f'{provider}: collection method differs')
        per_file = read_csv(root / f'data/humanizers/{provider}.csv', SCORE_COLUMNS)
        require(per_file == sorted(cohort, key=lambda r: r['sample_id']), f'{provider}: per-humanizer slice mismatch')
        result = results_by_id[provider]
        require(result['evaluated_outputs'] == 50, f'{provider}: summary output count mismatch')
        for key, values, score_key in [
            ('weighted_bypass_score', [float(r['weighted_bypass_score']) for r in cohort], 'weighted_bypass_score'),
            ('quality_score', [float(r['provisional_quality_score']) for r in cohort], 'quality_score'),
            ('overall_effectiveness_score', [float(r['overall_effectiveness_score']) for r in cohort], 'overall_effectiveness_score'),
        ]:
            close(result[key], statistics.fmean(values), f'{provider}: {key}')
        close(result['median_overall_effectiveness_score'], statistics.median(float(r['overall_effectiveness_score']) for r in cohort), f'{provider}: median')
        close(result['mean_length_ratio'], statistics.fmean(int(r['output_words']) / int(r['input_words']) for r in cohort), f'{provider}: length ratio')
        require(result['evidence_review_outputs'] == sum(r['evidence_review_required'] == 'True' for r in cohort), f'{provider}: review count mismatch')
        for detector in DETECTOR_WEIGHTS:
            detector_result = result['detectors'][detector]
            passed = sum(strict_pass(r, detector) for r in cohort)
            require(detector_result['strict_bypass_count'] == passed, f'{provider}: {detector} pass count mismatch')
            close(detector_result['strict_bypass_rate_percent'], 2 * passed, f'{provider}: {detector} pass rate')
            field = DETECTOR_SCORE_FIELDS[detector]
            close(detector_result['mean_native_human_score'], statistics.fmean(float(r[field]) for r in cohort), f'{provider}: {detector} score mean')

    expected_review = sum(r['evidence_review_required'] == 'True' for r in rows)
    require(expected_review == summary['evidence_review_outputs'] == policy['evidence_review_outputs'], 'Review total mismatch')
    hashes = {
        'scores.csv': sha_file(root / 'data/scores.csv'),
        'source-texts.csv': sha_file(root / 'data/source-texts.csv'),
        'output-commitments.csv': sha_file(root / 'data/output-commitments.csv'),
    }
    require(summary['source_files'] == hashes, 'Summary source-file hashes mismatch')
    require(policy['published_file_hashes'] == hashes, 'Methodology source-file hashes mismatch')
    require(provenance['source_texts_verified'] == 50, 'Provenance source count mismatch')
    require(provenance['captured_output_pairs_verified'] == 850 and provenance['unique_output_hashes'] == 850, 'Provenance output count mismatch')
    private = provenance['private_evidence_commitments']
    require(set(private['detector_tables']) == set(DETECTOR_WEIGHTS), 'Private detector commitment roster mismatch')
    require(all(item['records_verified'] == 850 and len(item['file_sha256']) == 64 for item in private['detector_tables'].values()), 'Invalid private detector commitment')
    baseline_provider_hashes = continuation['baseline_humanizer_csv_sha256']
    require(set(baseline_provider_hashes) == HUMANIZERS - {'gpthuman'}, 'Prior provider hash roster mismatch')
    for provider, expected_hash in baseline_provider_hashes.items():
        require(sha_file(root / f'data/humanizers/{provider}.csv') == expected_hash, f'{provider}: prior CSV bytes changed')

    return {
        'status': 'verified',
        'report_id': REPORT_ID,
        'frozen_inputs': 50,
        'humanizers': 17,
        'outputs': 850,
        'detector_scores': 4250,
        'evidence_review_outputs': expected_review,
        'public_files': len(actual),
        'file_tree_sha256': tree_hash,
    }


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('report_dir', type=Path)
    args = parser.parse_args()
    try:
        result = verify_report(args.report_dir)
    except (ValueError, KeyError, OSError, csv.Error, TypeError) as error:
        parser.exit(1, f'Verification failed: {error}\n')
    print(json.dumps(result, indent=2))
    print('Verified public integrity and arithmetic; raw humanized text and private quality instructions were not accessed.')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
