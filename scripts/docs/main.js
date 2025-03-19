const nexusMods = require("./markdown");
const steamWorkshop = require("./steamWorkshop");
const bbcodenm = require("./bbcodenm");
const path = require("path");

const documentationPath = path.join(__dirname, "../../documentation");
const title = path.join(documentationPath, "title.md");
const badges = path.join(documentationPath, "badges.md");
const about = path.join(documentationPath, "about.md");
const showCase = path.join(documentationPath, "showcase.md");
const content = path.join(documentationPath, "content.md");
const faq = path.join(documentationPath, "faq.md");
const changeLogs = path.join(path.join(__dirname, "../.."), "changelog.md");

nexusMods([title, badges, about, showCase, content]);
steamWorkshop([title, about, content, faq, changeLogs]);
bbcodenm();
