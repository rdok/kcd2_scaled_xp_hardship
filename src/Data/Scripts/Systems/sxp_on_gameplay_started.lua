local SystemListeners = {}
local log = _G.ScaledXPHardship.Log
local perkManager = _G.ScaledXPHardship.PerkManager

function SystemListeners:OnGameplayStarted(actionName, eventName, argTable)
    log:info(
            string.format(
                    "SystemEvent: actionName: %s, eventName: %s, argTable: ",
                    actionName,
                    eventName
            ),
            argTable
    )
    perkManager:init()
end

UIAction.RegisterEventSystemListener(SystemListeners, "", "OnGameplayStarted", "OnGameplayStarted")
