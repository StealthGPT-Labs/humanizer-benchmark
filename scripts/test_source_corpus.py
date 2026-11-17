import unittest
from source_corpus import select_topics, word_count, validate_text
class CorpusTests(unittest.TestCase):
 def test_selection_is_replayable_unique_and_seed_sensitive(self):
  bank=[f'topic {i}' for i in range(20)]
  a=select_topics('a','essay',bank)
  self.assertEqual(a,select_topics('a','essay',list(reversed(bank))))
  self.assertEqual(len(set(a)),5)
  self.assertNotEqual(a,select_topics('b','essay',bank))
 def test_invalid_outputs_cannot_enter_corpus(self):
  self.assertEqual(word_count('one  two\nthree'),3)
  self.assertIn('length',validate_text('short','stop',set()))
  text=' '.join(['writing']*600)
  self.assertEqual(validate_text(text,'stop',set()),[])
  self.assertIn('truncated',validate_text(text,'length',set()))
if __name__=='__main__':unittest.main()
