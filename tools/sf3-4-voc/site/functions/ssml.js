"use strict";

const MAX_SSML_CHARS = 2000;
const MIN_RATE_PERCENT = 25;
const MAX_RATE_PERCENT = 400;

function invalid(message) {
  const error = new Error(message);
  error.code = "INVALID_SSML";
  throw error;
}

function decodeXml(value) {
  return String(value)
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
}

function adaptSsml({ ssml, text, speechType, wordSpeed = 0.7, sentenceSpeed = 0.6 }) {
  const fallbackText = String(text || "").trim();
  const fallbackSpeed = speechType === "sentence" ? sentenceSpeed : wordSpeed;
  const raw = String(ssml || "").trim();
  if (!raw) return { input: fallbackText, speed: fallbackSpeed, used: false };
  if (raw.length > MAX_SSML_CHARS) invalid("SSML is too long.");
  if (/<!DOCTYPE|<!ENTITY|<\?xml/i.test(raw)) invalid("Unsafe XML declarations are not allowed.");

  const speakMatch = raw.match(/^<speak>([\s\S]*)<\/speak>$/i);
  if (!speakMatch) invalid("SSML must use one outer <speak> element.");

  const prosodyMatch = speakMatch[1].match(/^<prosody\s+rate=(["'])(\d{1,3})%\1>([\s\S]*)<\/prosody>$/i);
  if (!prosodyMatch) invalid('SSML must contain one <prosody rate="...%"> element.');

  const ratePercent = Number(prosodyMatch[2]);
  if (ratePercent < MIN_RATE_PERCENT || ratePercent > MAX_RATE_PERCENT) invalid("SSML rate must be between 25% and 400%.");

  let content = prosodyMatch[3];
  content = content.replace(/<sub\s+alias=(["'])([^"']+)\1>([\s\S]*?)<\/sub>/gi, (_match, _quote, alias) => decodeXml(alias));
  content = content.replace(/<break\s+time=(["'])(\d{1,4})ms\1\s*\/>/gi, (_match, _quote, milliseconds) => Number(milliseconds) >= 350 ? " ... " : ", ");
  if (/[<>]/.test(content)) invalid("Only <speak>, <prosody>, <break>, and <sub alias> SSML tags are supported.");

  let input = decodeXml(content).replace(/\s+/g, " ").trim();
  if (!input) invalid("SSML does not contain readable text.");
  if (speechType === "word") {
    const neutralWord = input.replace(/[.?!\s]+$/g, "").trim();
    if (!neutralWord) invalid("SSML does not contain a readable vocabulary word.");
    input = neutralWord + ".";
  }
  return { input, speed: ratePercent / 100, used: true };
}

module.exports = { adaptSsml };
