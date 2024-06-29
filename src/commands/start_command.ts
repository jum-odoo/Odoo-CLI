import { Command } from "../command";
import { start } from "../utils";

Command.register({
    name: "start",
    options: ["*"],
    defaultOption: "addons",
    handler: start,
});
