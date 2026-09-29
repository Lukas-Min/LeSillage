/**
 * The main submit of a form (Save, Create, Add…): full width on a phone,
 * its own width and on the right from `sm` up. Works in block, flex and grid
 * parents. See .cursor/rules/form-actions.mdc. Sign-in and sign-up keep their
 * full-width buttons.
 */
// sm:flex, not sm:block: a Button is a flex row (label + icon), and `block`
// dropped that layout, so an icon wrapped onto its own line ("Parse paste →").
export const FORM_ACTION_CLASS = "h-11 w-full sm:ml-auto sm:flex sm:w-fit";
