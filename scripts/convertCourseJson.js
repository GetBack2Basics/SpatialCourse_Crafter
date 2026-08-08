#!/usr/bin/env node

/**
 * CLI tool to convert raw CSV or GeoJSON files into standardized SpatialCourse JSON files.
 * Usage: node scripts/convertCourseJson.js <input_file> <output_file> [course_title]
 */

import fs from 'fs';
import path from 'path';
import { parseCsvToCourse, parseGeoJsonToCourse, validateCourseSchema } from '../src/utils/courseConverter.js';

const args = process.argv.slice(2);

if (args.length < 2) {
  console.log("Usage: node scripts/convertCourseJson.js <input_file> <output_file> [course_title]");
  console.log("Supported input formats: .csv, .geojson, .json");
  process.exit(1);
}

const inputPath = path.resolve(args[0]);
const outputPath = path.resolve(args[1]);
const title = args[2] || path.basename(inputPath, path.extname(inputPath));

if (!fs.existsSync(inputPath)) {
  console.error(`Error: Input file does not exist: ${inputPath}`);
  process.exit(1);
}

try {
  const content = fs.readFileSync(inputPath, 'utf8');
  const ext = path.extname(inputPath).toLowerCase();

  let course;
  if (ext === '.csv') {
    course = parseCsvToCourse(content, title);
  } else if (ext === '.geojson' || (ext === '.json' && content.includes('"FeatureCollection"'))) {
    course = parseGeoJsonToCourse(content, title);
  } else if (ext === '.json') {
    course = JSON.parse(content);
    if (!validateCourseSchema(course)) {
      throw new Error("Input JSON does not match valid SpatialCourse schema.");
    }
  } else {
    throw new Error(`Unsupported file extension: ${ext}`);
  }

  fs.writeFileSync(outputPath, JSON.stringify(course, null, 2), 'utf8');
  console.log(`Successfully converted ${inputPath} -> ${outputPath}`);
  console.log(`Course Title: ${course.title}`);
  console.log(`Waypoints Count: ${course.clues.length}`);
} catch (err) {
  console.error(`Conversion failed: ${err.message}`);
  process.exit(1);
}
