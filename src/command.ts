import {
    CommandOption,
    CommandOptionType,
    type CommandOptionDefinition,
} from "./commands/command_options";
import { LocalError } from "./constants";
import { resolve, Resolver } from "./utils";

export interface CommandDefinition {
    name: string;
    defaultArgs?: Resolver<string[]>;
    defaultOption?: string;
    alt?: string[];
    handler: CommandHandler;
    options?: CommandOptionDefinition[];
}

export type CommandHandler = (command: Command, args: string[]) => any;

export class Command {
    static definitions: Map<string, CommandDefinition> = new Map();

    static find(args: string[]) {
        const firstNonOptionIndex = args.findIndex((arg) => !arg.startsWith("-"));
        let name;
        if (firstNonOptionIndex < 0) {
            name = "start";
        } else {
            [name] = args.splice(firstNonOptionIndex, 1);
            name = name.toLowerCase();
        }
        const commandDefinition =
            this.definitions.get(name) ||
            [...this.definitions.values()].find((desc) => desc.alt?.includes(name));
        if (!commandDefinition) {
            throw new LocalError(`unknown command: "${name}"`);
        }
        return new this(commandDefinition);
    }

    static register(
        definition: Omit<CommandDefinition, "options"> & {
            options?: Parameters<typeof CommandOption.parse>;
        }
    ) {
        const fullDefinition = {
            ...definition,
            options: CommandOption.parse(...(definition.options || [])),
        };
        this.definitions.set(definition.name, fullDefinition);
        return fullDefinition;
    }

    definition: CommandDefinition;
    options: Record<string, CommandOption> = Object.create(null);

    get lastOption() {
        return this.optionList.at(-1);
    }

    get optionList() {
        return Object.values(this.options);
    }

    constructor(definition: CommandDefinition) {
        this.definition = definition;
    }

    async processOptions() {
        // Auto-complete default options & check missing required options
        for (const optionDefinition of Object.values(this.definition.options || {})) {
            const { defaultValues, name, required } = optionDefinition;
            if (name in this.options) {
                continue;
            }
            if (defaultValues) {
                // Option has a default value
                const option = this.registerOption(name, "long");
                option.addValues(...(await resolve(defaultValues)));
            } else if (required) {
                // Option is required
                throw new LocalError(`missing required option: ${name}`);
            }
        }

        // Parse option values (in parallel)
        await Promise.all(this.optionList.map((option) => option.parseValues()));

        // Apply option effects (sequentially)
        for (const option of this.optionList) {
            await option.applyEffect(this);
        }
    }

    registerOption(optionName: string, type: CommandOptionType) {
        const lower = optionName.toLowerCase();
        const optionDefinition = this.definition.options?.find((option) => {
            if (type === "short") {
                return option.short === lower;
            } else {
                return option.name === lower || option.alt?.includes(lower);
            }
        });
        if (!optionDefinition) {
            throw new LocalError(
                `unknown option: "${lower}" with command "${this.definition.name}"`
            );
        }
        if (!(optionDefinition.name in this.options)) {
            this.options[optionDefinition.name] = new CommandOption(optionDefinition, type);
        }
        return this.options[optionDefinition.name];
    }

    async run() {
        // Generate final command arguments from option values
        const args: string[] = (await resolve(this.definition.defaultArgs)) || [];
        for (const option of this.optionList) {
            if (option.definition?.flag) {
                args.push(option.definition.flag);
            }
            if (option.values.length) {
                args.push(option.values.join(","));
            }
        }

        // Call command handler
        await this.definition.handler(this, args);
    }
}
