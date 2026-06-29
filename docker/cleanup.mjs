import { stripNodeModules } from "./strip-modules.mjs";
import { execSync } from "node:child_process";

stripNodeModules("node_modules");

console.log("size:", execSync("du -sh node_modules", { encoding: "utf8" }).trim());
