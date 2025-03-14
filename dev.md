# Developer Notes

These notes outline the validation process for the XP reduction mechanics in the mod. The objective was to verify that the perk multipliers specified in the XML file (e.g., `xpm*0.50` for Dawn of Pain, `xpm*0.35` for Shade of Weakness, etc.) correctly reduce XP as intended across defined main level thresholds. A base XP value of 100 was selected for simplicity, as it aligns cleanly with the XML multipliers (e.g., 100 * 0.50 = 50, a 50% reduction). Testing began with a main level of 6 and an alchemy skill level of 11 as a starting point. Main stats were then incrementally increased to raise the main level, triggering the corresponding perks. The console command `# player.soul:AddSkillXP("alchemy", 100)` was executed to apply a consistent XP input of 100, and the resulting effective XP values were compared against the expected reductions. The results confirmed that the XP reductions matched the XML-defined multipliers at each level tier.

# User Acceptance (UA) Testing

## Verifying Perk Application at Level Thresholds (5/10/15/20/25/30)

To test perk application at main level thresholds (5, 10, 15, 20, 25, 30), starting from a lower level makes the XP reductions easy to check. Use these steps:

1. **Increase Main Level:**
    - Run `# player.soul:AdvanceToStatLevel("strength", 15)` to set the main level (e.g., 10).

2. **Add XP and Check:**
    - Run `# player.soul:AddSkillXP("alchemy", 100)` and confirm the XP added matches the expected reduction (e.g., 35 at level 10 for Shade of Weakness, a 65% reduction).