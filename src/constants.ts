import { homedir } from "os";
import { join, relative } from "path";

let debug = false;

export function isDebug() {
    return debug;
}

export function setDebug(value: boolean) {
    debug = value;
}

export class LocalError extends Error {}

export const ROOT_PATH = join(homedir(), "odoo");
export const COMMUNITY_PATH = join(ROOT_PATH, "community");
export const ENTERPRISE_PATH = join(ROOT_PATH, "enterprise");

export const ADDON_PATHS = {
    community: join(COMMUNITY_PATH, "addons"),
    ["design-themes"]: join(ROOT_PATH, "design-themes"),
    enterprise: ENTERPRISE_PATH,
};
export const BIN_PATH = join(COMMUNITY_PATH, "odoo-bin");
export const SRC_PATH = join("static", "src");

export const MANIFEST_FILE_NAME = "__manifest__.py";
export const MODULES = {
    CRM: "crm",
    HR_HOLIDAYS_ATTENDANCE: "hr_holidays_attendance",
    HR_PAYROLL: "hr_payroll",
    PLANNING: "planning",
    PROJECT: "project",
    SALE_SUBSCRIPTION: "sale_subscription",
    WEBSITE: "website",
};
export const ADDON_PACKS: Record<string, string[]> = {
    default: [MODULES.CRM, MODULES.PROJECT, MODULES.WEBSITE],
    hr: [
        MODULES.CRM,
        MODULES.PROJECT,
        MODULES.PLANNING,
        MODULES.HR_HOLIDAYS_ATTENDANCE,
        MODULES.HR_PAYROLL,
    ],
    sale: [MODULES.CRM, MODULES.PROJECT, MODULES.WEBSITE, MODULES.SALE_SUBSCRIPTION],
    sales: [MODULES.CRM, MODULES.PROJECT, MODULES.WEBSITE, MODULES.SALE_SUBSCRIPTION],
};

export const R_FULL_MATCH = /^--(?<name>[\w-]+)/;
export const R_SHORT_MATCH = /^-(?<names>[\w-]+)/;
export const R_VALID_MODULE_NAME = /^[a-z][\w-]*$/;
