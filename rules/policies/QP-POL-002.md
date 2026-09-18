# Policy: Clinical Firewall between the Two Lanes

**ID:** QP-POL-002
**Effective Date:** 2026-09-16
**Status:** Active

## Purpose

To keep commercial chargeback exposure away from clinical revenue, and to keep clinical data out of a commercial environment. The firewall is structural rather than procedural: the two lanes do not share a processor, a settlement account, a repository, or a schedule.

## The two lanes

The clinical lane runs on the org property and settles through the clinical processor into the clinical account. No checkout logic, no cart handler, and no retail data exist on that property. Traffic leaving for the retail property passes through an explicit interstitial that tells the visitor where they are going and that their clinical data stays behind.


The retail lane runs on the com property and settles through the commercial processor into the commercial account. No clinical data exists on that property.

## Prohibitions

The commercial processor is prohibited on the retail lane and must return zero hits in that repository. No cross-lane processing of any kind is permitted: a clinical transaction never touches the commercial processor and a retail transaction never touches the clinical account.

## Why it is written as a wall rather than a guideline

A guideline assumes someone is present to apply it. The two properties are worked on by different people at different times, and the cost of a single crossed transaction is not a fee, it is the clinical revenue stream becoming exposed to commercial chargeback risk.
