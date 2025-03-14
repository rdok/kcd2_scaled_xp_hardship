local Log = {}

function Log:getLocalTime()
    local localTime = System.GetLocalOSTime()
    return string.format("%04d-%02d-%02d %02d:%02d:%02d",
            localTime.year + 1900, localTime.mon + 1, localTime.mday,
            localTime.hour, localTime.min, localTime.sec)
end

function Log:log(level, colorCode, ...)
    local localTime = self:getLocalTime()
    local args = { ... }
    local messageParts = {}

    for _, arg in ipairs(args) do
        if type(arg) == "table" then
            local isSequential = true
            for k in pairs(arg) do
                if type(k) ~= "number" or k < 1 or math.floor(k) ~= k then
                    isSequential = false
                    break
                end
            end

            if isSequential then
                local tableParts = {}
                for _, v in ipairs(arg) do
                    tableParts[#tableParts + 1] = tostring(v)
                end
                messageParts[#messageParts + 1] = table.concat(tableParts, ", ")
            else
                local tableParts = {}
                for k, v in pairs(arg) do
                    tableParts[#tableParts + 1] = tostring(k) .. "=" .. tostring(v)
                end
                messageParts[#messageParts + 1] = "{" .. table.concat(tableParts, ", ") .. "}"
            end
        else
            messageParts[#messageParts + 1] = tostring(arg)
        end
    end

    local message = table.concat(messageParts, " ")
    System.LogAlways(string.format("%s[%s] [%s.%s] %s",
            colorCode,
            localTime,
            _G.ScaledXPHardship.modName,
            level,
            message
    ))
end

function Log:info(...)
    if not _G.ScaledXPHardship.isProduction then
        self:log("INFO", "$5", ...)
    end
end

function Log:error(...)
    self:log("ERROR", "$4", ...)
end

_G.ScaledXPHardship.Log = Log

return Log