/**
 * Content Filtering Utility
 * 
 * Provides comprehensive filtering for profanity and inappropriate content
 * in all user-generated content throughout the application.
 */

import { Filter } from 'bad-words';

// Initialize the filter with custom configuration
const filter = new Filter();

// Add additional inappropriate patterns to catch variations and intentional misspellings
const additionalPatterns = [
  // Common substitution patterns (l33t speak, symbol substitutions)
  /n[i1!]gg[e3]r/gi,
  /f[u*]ck/gi,
  /sh[i1!]t/gi,
  /[a@]ss/gi,
  /b[i1!]tch/gi,
  /c[u*]nt/gi,
  /d[i1!]ck/gi,
  /p[u*]ssy/gi,
  /wh[o0]re/gi,
  /sl[u*]t/gi,
  /r[e3]t[a@]rd/gi,
  /f[a@]g/gi,
  // Hate speech and slurs
  /k[i1!]ke/gi,
  /ch[i1!]nk/gi,
  /sp[i1!]c/gi,
  /g[o0][o0]k/gi,
  // Sexual content indicators
  /p[o0]rn/gi,
  /s[e3]x/gi,
  /xxx/gi,
  /n[a@]k[e3]d/gi,
  /n[u*]d[e3]/gi,
  // Violence and threats
  /k[i1!]ll/gi,
  /d[i1!][e3]/gi,
  /m[u*]rd[e3]r/gi,
  /r[a@]p[e3]/gi,
  // Spam and scam indicators
  /fr[e3][e3]\s*m[o0]n[e3]y/gi,
  /cl[i1!]ck\s*h[e3]r[e3]/gi,
  /g[e3]t\s*r[i1!]ch/gi,
  /\$\$\$/gi,
  // Personal information attempts
  /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g, // Phone numbers
  /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, // Email addresses
  // Excessive capitalization (spam indicator)
  /\b[A-Z]{8,}\b/g,
];

/**
 * Check if text contains inappropriate content
 * @param text - The text to check
 * @returns true if content is inappropriate, false otherwise
 */
export function containsInappropriateContent(text: string | undefined | null): boolean {
  if (!text || typeof text !== 'string') {
    return false;
  }

  // Check with bad-words library
  if (filter.isProfane(text)) {
    return true;
  }

  // Check against additional patterns
  for (const pattern of additionalPatterns) {
    if (pattern.test(text)) {
      return true;
    }
  }

  // Check for excessive special characters (spam indicator)
  // Be more lenient with punctuation - only flag if >40% of text is special chars
  const specialCharCount = (text.match(/[!@#$%^&*()_+={}\[\]|\\:;"'<>,.?\/~`]/g) || []).length;
  if (specialCharCount > text.length * 0.4) {
    return true;
  }

  // Check for excessive repetition (spam indicator)
  // Allow up to 3 consecutive characters (e.g., "..." or "!!!" is ok)
  // Only flag if 4+ consecutive identical characters
  const repetitionPattern = /(.)\1{4,}/g;
  if (repetitionPattern.test(text)) {
    return true;
  }

  return false;
}

/**
 * Clean/filter text by replacing inappropriate content with asterisks
 * @param text - The text to clean
 * @returns Cleaned text with inappropriate content replaced
 */
export function cleanText(text: string | undefined | null): string {
  if (!text || typeof text !== 'string') {
    return '';
  }

  // Use bad-words library to clean
  let cleaned = filter.clean(text);

  // Clean additional patterns
  for (const pattern of additionalPatterns) {
    cleaned = cleaned.replace(pattern, (match: string) => '*'.repeat(match.length));
  }

  // Clean excessive repetition
  cleaned = cleaned.replace(/(.)\1{5,}/g, (match: string) => match[0].repeat(3));

  return cleaned;
}

/**
 * Validate and filter user-generated text content
 * Throws an error if content is inappropriate
 * @param text - The text to validate
 * @param fieldName - Name of the field being validated (for error messages)
 * @throws Error if content contains inappropriate material
 */
export function validateAndFilterText(
  text: string | undefined | null,
  fieldName: string = 'Content'
): string {
  if (!text || typeof text !== 'string') {
    return '';
  }

  // Trim whitespace
  const trimmed = text.trim();

  // Check if empty after trimming
  if (!trimmed) {
    throw new Error(`${fieldName} cannot be empty`);
  }

  // Check length constraints (prevent extremely long inputs)
  if (trimmed.length > 5000) {
    throw new Error(`${fieldName} is too long (maximum 5000 characters)`);
  }

  // Check for inappropriate content
  if (containsInappropriateContent(trimmed)) {
    throw new Error(`${fieldName} contains inappropriate or offensive content. Please revise your input.`);
  }

  return trimmed;
}

/**
 * Validate a username
 * More strict validation for usernames
 * @param username - The username to validate
 * @throws Error if username is invalid
 */
export function validateUsername(username: string | undefined | null): string {
  if (!username || typeof username !== 'string') {
    throw new Error('Username is required');
  }

  const trimmed = username.trim();

  // Check length
  if (trimmed.length < 3) {
    throw new Error('Username must be at least 3 characters long');
  }

  if (trimmed.length > 30) {
    throw new Error('Username must be 30 characters or less');
  }

  // Check for inappropriate content
  if (containsInappropriateContent(trimmed)) {
    throw new Error('Username contains inappropriate or offensive content. Please choose a different username.');
  }

  // Check for valid characters (alphanumeric, underscore, hyphen)
  if (!/^[a-zA-Z0-9_-]+$/.test(trimmed)) {
    throw new Error('Username can only contain letters, numbers, underscores, and hyphens');
  }

  return trimmed;
}

/**
 * Validate company/product name
 * @param name - The name to validate
 * @param type - Type of entity (for error messages)
 * @throws Error if name is invalid
 */
export function validateName(name: string | undefined | null, type: string = 'Name'): string {
  if (!name || typeof name !== 'string') {
    throw new Error(`${type} is required`);
  }

  const trimmed = name.trim();

  // Check length
  if (trimmed.length < 1) {
    throw new Error(`${type} cannot be empty`);
  }

  if (trimmed.length > 100) {
    throw new Error(`${type} must be 100 characters or less`);
  }

  // Check for inappropriate content
  if (containsInappropriateContent(trimmed)) {
    throw new Error(`${type} contains inappropriate or offensive content. Please choose a different name.`);
  }

  return trimmed;
}

/**
 * Validate description
 * @param description - The description to validate
 * @param fieldName - Name of the field (for error messages)
 * @throws Error if description is invalid
 */
export function validateDescription(
  description: string | undefined | null,
  fieldName: string = 'Description'
): string | undefined {
  // Descriptions are optional
  if (!description || typeof description !== 'string') {
    return undefined;
  }

  const trimmed = description.trim();

  if (!trimmed) {
    return undefined;
  }

  // Check length
  if (trimmed.length > 1000) {
    throw new Error(`${fieldName} must be 1000 characters or less`);
  }

  // Check for inappropriate content
  if (containsInappropriateContent(trimmed)) {
    throw new Error(`${fieldName} contains inappropriate or offensive content. Please revise your description.`);
  }

  return trimmed;
}
