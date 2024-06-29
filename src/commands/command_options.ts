import { Command } from "../command";
import { ADDON_PATHS, LocalError, setDebug } from "../constants";
import { getDefaultDbName, parseAddons, Resolver } from "../utils";

export interface CommandOptionDefinition {
    autoInclude?: boolean;
    alt?: string[];
    defaultValues?: Resolver<string[]>;
    effect?: (command: Command) => any;
    flag?: string;
    help?: string;
    name: string;
    parse?: (values: string[]) => string[] | PromiseLike<string[]>;
    required?: boolean;
    short?: string;
    standalone?: boolean;
}

export type CommandOptionType = "short" | "long";

export class CommandOption {
    static definitions: Map<string, CommandOptionDefinition> = new Map();

    static parse(
        ...specs: (
            | string
            | Record<string, Partial<CommandOptionDefinition> | null>
            | [string, Partial<CommandOptionDefinition> | null]
        )[]
    ) {
        const result: Record<string, CommandOptionDefinition> = Object.create(null);
        while (specs.length) {
            const spec = specs.shift()!;
            const specObject = typeof spec === "string" ? ([spec, null] as [string, null]) : spec;
            if (!Array.isArray(specObject)) {
                specs.unshift(...Object.entries(specObject));
                continue;
            }
            if (specObject[0] === "*") {
                specs.unshift(...this.definitions.keys());
                continue;
            }
            const [name, override] = specObject;
            result[name] = {
                ...(result[name] ?? this.definitions.get(name)),
                ...override,
                name,
            };
        }
        for (const option of this.definitions.values()) {
            if (option.autoInclude) {
                result[option.name] ||= option;
            }
        }
        return Object.values(result);
    }

    static register(definition: CommandOptionDefinition) {
        this.definitions.set(definition.name, definition);
        return definition;
    }

    definition: CommandOptionDefinition;
    type: CommandOptionType;
    values: string[] = [];

    get acceptsValues() {
        return !this.definition.standalone;
    }

    constructor(definition: CommandOptionDefinition, type: CommandOptionType) {
        this.definition = definition;
        this.type = type;
    }

    addValues(...values: string[]) {
        if (!this.acceptsValues) {
            throw new LocalError(`option '${this.definition.name}' does not accept any values`);
        }
        this.values.push(...values);
    }

    async applyEffect(command: Command) {
        if (this.definition?.effect) {
            await this.definition.effect(command);
        }
    }

    async parseValues() {
        if (this.definition.parse) {
            this.values = await this.definition.parse(this.values);
        }
    }
}

CommandOption.register({
    name: "addons-path",
    alt: ["path", "paths"],
    flag: "--addons-path",
    defaultValues: Object.values(ADDON_PATHS),
});

CommandOption.register({
    name: "addons",
    short: "i",
    alt: ["addon", "module", "modules"],
    flag: "--init",
    parse: parseAddons,
});

CommandOption.register({
    name: "community",
    alt: ["com"],
    standalone: true,
    effect(command) {
        const pathOption = command.options["addons-path"];
        if (pathOption) {
            pathOption.values = [ADDON_PATHS.community];
        }
    },
});

CommandOption.register({
    name: "database",
    short: "d",
    flag: "--database",
    defaultValues: getDefaultDbName,
});

CommandOption.register({
    name: "debug",
    autoInclude: true,
    standalone: true,
    effect: () => setDebug(true),
});

CommandOption.register({
    name: "dev",
    flag: "--dev",
    defaultValues: ["all"],
});

CommandOption.register({
    name: "port",
    short: "p",
    flag: "--http-port",
    defaultValues: ["8069"],
});

CommandOption.register({
    name: "template",
    short: "t",
    flag: "--db_template",
});

CommandOption.register({
    name: "update",
    short: "u",
    flag: "--update",
    parse: parseAddons,
});

CommandOption.register({
    name: "user",
    short: "r",
    flag: "--db_user",
});
