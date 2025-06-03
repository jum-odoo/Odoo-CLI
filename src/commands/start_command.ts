import { Command } from "../command";
import { start } from "../utils";

Command.register({
    name: "start",
    defaultArgs: ["--with-demo"],
    options: ["*"],
    defaultOption: "addons",
    handler: start,
});
