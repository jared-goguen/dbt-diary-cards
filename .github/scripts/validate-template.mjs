#!/usr/bin/env node

/**
 * Validation script for template.yaml
 * Checks:
 * - Valid YAML syntax
 * - Valid Gutenberg schema
 * - Has at least one _editable flag
 * 
 * Exit codes:
 * - 0: Validation passed
 * - 1: Validation failed
 */

import fs from 'fs';
import path from 'path';
import YAML from 'yaml';
import { lint } from '@jared-goguen/gutenberg/pipeline';

const templatePath = path.join(process.cwd(), 'template.yaml');

console.log('🔍 Validating template.yaml...\n');

// Step 1: Check file exists
if (!fs.existsSync(templatePath)) {
  console.error(`❌ Template file not found: ${templatePath}`);
  process.exit(1);
}

// Step 2: Parse YAML
let templateContent;
try {
  templateContent = fs.readFileSync(templatePath, 'utf-8');
} catch (error) {
  console.error(`❌ Failed to read template.yaml: ${error.message}`);
  process.exit(1);
}

let templateData;
try {
  templateData = YAML.parse(templateContent);
  console.log('✅ YAML syntax valid');
} catch (error) {
  console.error(`❌ YAML syntax error: ${error.message}`);
  process.exit(1);
}

// Step 3: Validate Gutenberg schema
try {
  const result = lint(templatePath);
  
  // lint() returns result object or throws
  if (result && result.errors && result.errors.length > 0) {
    console.error('❌ Gutenberg schema validation failed:');
    result.errors.forEach(err => {
      console.error(`   - ${err}`);
    });
    process.exit(1);
  }
  
  console.log('✅ Gutenberg schema valid');
} catch (error) {
  console.error(`❌ Schema validation error: ${error.message}`);
  process.exit(1);
}

// Step 4: Check for _editable flags
const sections = templateData?.page?.sections || [];
const editableSections = sections.filter(section => section._editable === true);

if (editableSections.length === 0) {
  console.error('❌ No sections marked as editable (_editable: true)');
  console.error(`   Found ${sections.length} sections, but none are editable`);
  process.exit(1);
}

console.log(`✅ Found ${editableSections.length} editable section(s)`);

// Success
console.log('\n✨ All validations passed!\n');
process.exit(0);
