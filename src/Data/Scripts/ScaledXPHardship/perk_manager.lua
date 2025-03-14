local log = _G.ScaledXPHardship.Log

log:info("### INITIALIZED PerkManager ###")

local PerkManager = {
    check_interval = 5000,
    timer_id = nil,
    applied_perk_id = nil
}

PerkManager.perks = {
    { name = "fading_strength_dawn_of_pain", level = 5, id = "b69b86bd-fd94-4179-8131-5a6b62c6ab6a" },
    { name = "fading_strength_shade_of_weakness", level = 10, id = "08262370-e762-4e83-974e-c0b4967b1515" },
    { name = "fading_strength_blight_of_vigor", level = 15, id = "0e1a71b9-e1f5-46a6-b42f-287e4c7a4e39" },
    { name = "fading_strength_reign_of_frail", level = 20, id = "75cc7fcf-d475-4ae0-940c-21068ecd67a2" },
    { name = "fading_strength_abyss_of_decline", level = 25, id = "af99b773-b7c2-4e0a-8c1d-2885b954bb7b" },
    { name = "fading_strength_fall_of_might", level = 28, id = "8adf9382-a351-4988-9e98-9056d062f979" },
}

function PerkManager:init()
    log:info("Started init")

    for _, perk in pairs(self.perks) do
        log:info("Removing perk with id " .. perk.id)
        _G.player.soul:RemovePerk(perk.id)
    end
    self:clear_active_perk()

    self:update_perk()

    self.timer_id = Script.SetTimer(self.check_interval, function()
        self:update_perk()
    end)
    log:info("Timer set with interval " .. self.check_interval)
end

function PerkManager:clear_active_perk()
    if self.applied_perk_id then
        log:info("Removing current perk with id " .. self.applied_perk_id)
        _G.player.soul:RemovePerk(self.applied_perk_id)
        self.applied_perk_id = nil
        log:info("Cleared currently active perk")
    else
        log:info("No active perk to clear")
    end
end

function PerkManager:update_perk()
    log:info("Checking perks for update")
    local max_perk_level = _G.player.soul:GetDerivedStat("lvl")
    log:info("Player level is " .. max_perk_level)

    local new_perk

    for _, perk in pairs(self.perks) do
        if max_perk_level >= perk.level and (not new_perk or perk.level > new_perk.level) then
            new_perk = perk
        end
    end

    local activePerkIsStale = self.applied_perk_id ~= new_perk.id
    --local activePerkIsStale = player.soul:HasPerk(new_perk.perk_id, false);
    if new_perk and activePerkIsStale then
        log:info("Updating to " .. new_perk.name .. " at level " .. new_perk.level)
        self:clear_active_perk()
        _G.player.soul:AddPerk(new_perk.id)
        self.applied_perk_id = new_perk.id
        log:info("Applied perk " .. new_perk.name .. " with id " .. new_perk.id)
    end

    self.timer_id = Script.SetTimer(self.check_interval, function()
        self:update_perk()
    end)
    log:info("Next check scheduled")
end

_G.ScaledXPHardship.PerkManager = _G.ScaledXPHardship.PerkManager
        or PerkManager

return PerkManager