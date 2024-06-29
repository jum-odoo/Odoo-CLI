import { homedir } from "os";
import { join } from "path";

let debug = false;

export function isDebug() {
    return debug;
}

export function setDebug(value: boolean) {
    debug = value;
}

export class LocalError extends Error {}

export const HOME = homedir();
export const BIN_PATH = join(HOME, "odoo", "odoo-bin");
export const ADDON_PATHS = {
    community: join(HOME, "odoo", "addons"),
    ["design-themes"]: join(HOME, "design-themes"),
    enterprise: join(HOME, "enterprise"),
};

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

export const R_FULL_MATCH = /^--(\w+)/;
export const R_SHORT_MATCH = /^-(\w+)/;
export const R_VALID_MODULE_NAME = /^[a-z][\w-]*$/;
