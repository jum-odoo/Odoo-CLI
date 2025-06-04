import { Command } from "../command";
import { start } from "../utils";

Command.register({
    name: "start",
    defaultArgs: ["--without-demo=False"],
    options: ["*"],
    defaultOption: "addons",
    handler: start,
});
