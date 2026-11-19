"""Public-report validation must reject tampering even after a manifest is updated."""
import csv
import hashlib
import json
import shutil
import tempfile
import unittest
from pathlib import Path
from verify_november_update import verify_report

REPORT = Path(__file__).resolve().parents[1] / 'reports/2026-11-18-humanizer-comparison'

class PublicReportTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.report = Path(self.temp.name) / REPORT.name
        shutil.copytree(REPORT, self.report)

    def rehash(self):
        path = self.report / 'manifest.json'
        manifest = json.loads(path.read_text())
        manifest['files'] = {str(p.relative_to(self.report)):hashlib.sha256(p.read_bytes()).hexdigest() for p in sorted(self.report.rglob('*')) if p.is_file() and p != path}
        manifest['file_tree_sha256'] = hashlib.sha256(''.join(f'{p}\0{sha}\n' for p,sha in sorted(manifest['files'].items())).encode()).hexdigest()
        path.write_text(json.dumps(manifest))

    def edit_scores(self, change):
        path = self.report / 'data/scores.csv'
        with path.open(newline='') as handle:
            reader = csv.DictReader(handle)
            fields, rows = reader.fieldnames, list(reader)
        change(fields, rows)
        with path.open('w', newline='') as handle:
            writer = csv.DictWriter(handle, fieldnames=fields)
            writer.writeheader()
            writer.writerows(rows)
        self.rehash()

    def test_complete_public_release_verifies(self):
        result = verify_report(self.report)
        self.assertEqual(result['outputs'], 800)
        self.assertEqual(result['humanizers'], 16)
        self.assertEqual(result['frozen_inputs'], 50)
        self.assertEqual(result['evidence_review_outputs'], 651)

    def test_changed_file_without_rehash_is_rejected(self):
        with (self.report/'README.md').open('a') as handle:
            handle.write('\nchanged\n')
        with self.assertRaises(ValueError): verify_report(self.report)

    def test_changed_grade_with_new_manifest_is_rejected(self):
        self.edit_scores(lambda fields, rows: rows[0].update(meaning='0'))
        with self.assertRaises(ValueError): verify_report(self.report)

    def test_missing_sample_with_new_manifest_is_rejected(self):
        self.edit_scores(lambda fields, rows: rows.pop())
        with self.assertRaises(ValueError): verify_report(self.report)

    def test_duplicate_sample_with_new_manifest_is_rejected(self):
        self.edit_scores(lambda fields, rows: rows[0].update(sample_id=rows[1]['sample_id']))
        with self.assertRaises(ValueError): verify_report(self.report)

    def test_raw_output_column_is_rejected(self):
        def change(fields, rows):
            fields.append('output_text')
            for row in rows: row['output_text']='private text must not be published'
        self.edit_scores(change)
        with self.assertRaises(ValueError): verify_report(self.report)

    def test_source_text_change_with_new_manifest_is_rejected(self):
        path=self.report/'data/source-texts.csv'
        with path.open(newline='') as handle:
            reader=csv.DictReader(handle);fields,rows=reader.fieldnames,list(reader)
        rows[0]['text'] += ' altered'
        with path.open('w',newline='') as handle:
            writer=csv.DictWriter(handle,fieldnames=fields);writer.writeheader();writer.writerows(rows)
        self.rehash()
        with self.assertRaises(ValueError): verify_report(self.report)

    def test_extra_private_file_is_rejected(self):
        (self.report/'data/judge-prompts.json').write_text('{"prompt":"not public"}')
        self.rehash()
        with self.assertRaises(ValueError): verify_report(self.report)

    def test_changed_provider_slice_is_rejected(self):
        path=self.report/'data/humanizers/stealth.csv'
        path.write_text(path.read_text().replace('sample_001','sample_999',1))
        self.rehash()
        with self.assertRaises(ValueError): verify_report(self.report)

    def test_wrong_detector_version_summary_is_rejected(self):
        path=self.report/'data/summary.json'
        value=json.loads(path.read_text());value['detectors'][0]['version']='unsupported-version'
        path.write_text(json.dumps(value));self.rehash()
        with self.assertRaises(ValueError): verify_report(self.report)

    def test_changed_summary_is_rejected(self):
        path=self.report/'data/summary.json'
        value=json.loads(path.read_text());value['results'][0]['overall_effectiveness_score']=99
        path.write_text(json.dumps(value));self.rehash()
        with self.assertRaises(ValueError): verify_report(self.report)

if __name__ == '__main__': unittest.main()
