export const PASSWORD_POLICY_REGEX =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;

export const PASSWORD_POLICY_MESSAGE =
  "Mínimo 8 caracteres, con mayúscula, minúscula, número y símbolo.";
