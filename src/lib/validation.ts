// Shared form validation for the browser and the API routes.
// Data minimisation (FR-4): a trial collects an email, an optional child's
// first name and a year group. Nothing else about the child.

export const YEAR_GROUPS = ["Year 1", "Year 2", "Year 3", "Year 4", "Year 5", "Year 6", "Not sure yet"] as const;
export type YearGroup = (typeof YEAR_GROUPS)[number];

export const PLANS = ["monthly", "annual"] as const;
export type Plan = (typeof PLANS)[number];

export const ROLES = ["Class teacher", "Maths lead", "Headteacher or deputy", "School business manager", "Other"] as const;
export type Role = (typeof ROLES)[number];

export type Errors<K extends string> = Partial<Record<K, string>>;

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
// letters (any script), spaces, hyphens, apostrophes
const FIRST_NAME = /^[\p{L}][\p{L}' -]{0,29}$/u;

const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");

export interface TrialInput {
  email: string;
  childFirstName: string;
  yearGroup: YearGroup | "";
  plan: Plan;
  grownUp: boolean;
  source: "site" | "game";
}

export function parseTrial(raw: Record<string, unknown>): { data: TrialInput; errors: Errors<keyof TrialInput> } {
  const data: TrialInput = {
    email: str(raw.email).toLowerCase(),
    childFirstName: str(raw.childFirstName),
    yearGroup: str(raw.yearGroup) as YearGroup,
    plan: (PLANS as readonly string[]).includes(str(raw.plan)) ? (str(raw.plan) as Plan) : "monthly",
    grownUp: raw.grownUp === true || raw.grownUp === "on" || raw.grownUp === "true",
    source: raw.source === "game" ? "game" : "site",
  };
  const errors: Errors<keyof TrialInput> = {};
  if (!data.email) errors.email = "Enter your email address.";
  else if (!EMAIL.test(data.email) || data.email.length > 254) errors.email = "Enter an email address like name@example.com.";
  if (data.childFirstName && !FIRST_NAME.test(data.childFirstName))
    errors.childFirstName = "Use letters only, up to 30. You can leave this blank.";
  if (!(YEAR_GROUPS as readonly string[]).includes(data.yearGroup)) errors.yearGroup = "Choose a year group, or “Not sure yet”.";
  if (!data.grownUp) errors.grownUp = "A parent or carer aged 18 or over needs to start the trial.";
  return { data, errors };
}

export interface DemoInput {
  name: string;
  email: string;
  school: string;
  role: Role | "";
  pupils: number;
  slot: string;
}

export function parseDemo(raw: Record<string, unknown>): { data: DemoInput; errors: Errors<keyof DemoInput> } {
  // number inputs arrive as numbers from JSON and as strings from form posts
  const pupils = typeof raw.pupils === "number" ? raw.pupils : Number.parseInt(str(raw.pupils), 10);
  const data: DemoInput = {
    name: str(raw.name),
    email: str(raw.email).toLowerCase(),
    school: str(raw.school),
    role: str(raw.role) as Role,
    pupils: Number.isFinite(pupils) ? pupils : NaN,
    slot: str(raw.slot),
  };
  const errors: Errors<keyof DemoInput> = {};
  if (!data.name) errors.name = "Enter your name.";
  else if (data.name.length > 80) errors.name = "Name must be 80 characters or fewer.";
  if (!data.email) errors.email = "Enter your school email address.";
  else if (!EMAIL.test(data.email)) errors.email = "Enter an email address like name@school.sch.uk.";
  if (!data.school) errors.school = "Enter your school’s name.";
  else if (data.school.length > 120) errors.school = "School name must be 120 characters or fewer.";
  if (!(ROLES as readonly string[]).includes(data.role)) errors.role = "Choose your role.";
  if (!Number.isInteger(data.pupils) || data.pupils < 1) errors.pupils = "Enter how many pupils, for example 210.";
  else if (data.pupils > 5000) errors.pupils = "For more than 5,000 pupils, email schools@doodlemath.example.";
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(data.slot)) errors.slot = "Choose a day and time for your demo.";
  return { data, errors };
}

export const hasErrors = (e: object) => Object.keys(e).length > 0;
