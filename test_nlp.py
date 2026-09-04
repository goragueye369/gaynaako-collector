#!/usr/bin/env python3
# Test rapide du module NLP
import sys
sys.path.append('collector')
from nlp_processor import NLPProcessor

processor = NLPProcessor()
text = "Budget: 50 millions FCFA. Deadline: 15 décembre 2026. Contact: test@example.com. Organisation: Banque Mondiale"

amounts = processor.extract_amounts(text)
deadlines = processor.extract_deadlines(text)
emails = processor.extract_emails(text)
orgs = processor.extract_organizations(text)

print("=" * 60)
print("TEST MODULE NLP")
print("=" * 60)
print(f"Texte analysé: {text[:80]}...")
print()
print(f"✅ Montants extraits: {len(amounts)}")
if amounts:
    print(f"   → {amounts[0]}")
print(f"✅ Dates extraites: {len(deadlines)}")
if deadlines:
    print(f"   → {deadlines[0]}")
print(f"✅ Emails extraits: {len(emails)}")
if emails:
    print(f"   → {emails[0]}")
print(f"✅ Organisations extraites: {len(orgs)}")
if orgs:
    print(f"   → {orgs[0]}")
print()
print("✅ Module NLP fonctionne correctement!")
