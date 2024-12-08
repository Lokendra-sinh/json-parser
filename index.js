const complex = `{
    "non_empty_key": "empty_string",
    "special_chars": "quo\\"te\\\\path\\\\\\\\",
    "unicode": "Hello\\u0020World\\u2728",
    "nested": [[[[[]]]],{"x":{"y":[]}},[]],
    "numbers": [0, -0, 1e-10, -23.4e+12, 12345.6789],
    "nulls": [null,{"key":null},[[null]]],
    "zero_fraction": 0.0000000000000000001
  }`
  
  // Test Case 2: Deeply nested object without trailing commas
  const test2 = `{
    "a": {
      "b": {
        "c": {
          "d": {
            "e": [1,2,3],
            "f": {"g": null}
          }
        }
      }
    }
  }`
  
  // Test Case 3: Mixed data types and whitespace variations
  const test3 = `{
    "bool_array":[true,    false,   true],
    "mixed_array":[1,"two",null,false,{"key":[]}, [{}]],
    "spaces in key": "value",
    "tab_key": "value with tab\\t",
    "newline_key": "value\\nwith\\nnewlines",
    "control_chars": "\\b\\f\\n\\r\\t",
    "max_min": [1.7976931348623157e+308, 5e-324]
  }`
  
  // Test Case 4: Edge cases with numbers and escaping
  const test4 = `{
    "numbers": {
      "integer": 9007199254740991,
      "negative": -9007199254740991,
      "decimal": 0.123456789,
      "scientific": 1.23e-123,
      "special": [
        0.0,
        -0.0,
        1e-10,
        -23.4e+12
      ]
    },
    "escaped_quotes": "\\"quoted text\\" with 'single' quotes",
    "escaped_slashes": "\\\\\\\\",
    "escaped_unicode": "\\u0022\\u005C\\u002F",
    "nested_quotes": {"key": "value \\"inside\\" quotes"}
  }`

  const tests = [ test2, test3, test4]

  console.log(JSON.parse(complex))


export const parenthesisStack = [];
export const tempJsonStack = [];
export const tempJson = {};
export let currentKey = "";
export let currentValue = "";
let state = "building_value";

for (let i = 0; i < complex.length; i++) {
  const ch = complex[i];
  switch (state) {
    case "building_value":
      buildingValue(ch);
      break;
      case "build_key":
        if (/\s/.test(ch)) {
        } else if (ch === '"') {
            currentKey = "";
            state = "collect_key";
        } else if (ch === ',') {
            throw new Error(`Unexpected comma while expecting a key`);
        } else if (ch === ':') {
            throw new Error(`Unexpected colon while expecting a key`);
        } else if (ch === '{' || ch === '}') {
            throw new Error(`Unexpected ${ch} while expecting a key`);
        } else {
            console.error("Invalid character found while building key:", ch);
            throw new Error(`Key must start with " but found ${ch}`);
        }
        break;
    case "collect_key":
      if (ch === '"') {
        if (currentKey.length === 0) {
          throw new Error("Empty key is not allowed");
        }
        state = "colon";
      } else if (
        ch === "{" ||
        ch === "}" ||
        ch === "[" ||
        ch === "]" ||
        ch === ":" ||
        ch === ","
      ) {
        throw new Error(`Invalid character "${ch}" in key`);
      } else {
        currentKey += ch;
      }
      break;
    case "colon":
      if (ch === ":") {
        state = "expect_value";
      } else if (ch !== " ") {
        throw new Error("Invalid JSON");
      }
      break;
    case "expect_value":
      buildingValue(ch);
      break;
    case "after_value":
      afterValue(ch);
      break;
    case "build_string":
      buildString(ch);
      break;
    case "build_null":
      buildNull(ch);
      break;
    case "build_number":
      buildNumber(ch);
      break;
    case "build_boolean":
      buildBoolean(ch);
      break;
    case "after_comma_obj":
        afterCommaObj(ch)
        break
    case "after_comma_array":
        afterCommaArray(ch)
        break
    default:
      throw new Error("Invalid State");
  }
}

console.log("Final parsed JSON object:", JSON.stringify(tempJson, null, 2));

function appendValueToContainer(value) {
  const tE = tempJsonStack[tempJsonStack.length - 1];
  if (tE.type === "obj") {
    tE.container[currentKey] = value;
  } else {
    tE.container.push(value);
  }
  currentKey = "";
  currentValue = "";
  state = "after_value";
  return;
}

function afterCommaObj(ch){
    if (/\s/.test(ch)) {
        return;
      }
      if (ch === '"') {
        currentKey = "";
        state = "collect_key";
      } else if (ch === '}') {
        console.error("Trailing comma in object");
      } else {
        throw new Error("Expected property name or '}'");
      }
}

function afterCommaArray(ch){
    if (/\s/.test(ch)) {
        return;
      }
      if (ch === ']') {
        console.error("Trailing comma in array");
        state = "after_value"
        afterValue(ch)
      } else {
        state = "expect_value";
        buildingValue(ch);  // Process this character as a value
      }
}

export function buildString(ch) {
  if (ch === '"') {
    if (currentValue === "" && state === "expect_value") {
      throw new Error("Empty string value is not allowed");
    }
    appendValueToContainer(currentValue);
    return;
  } else if (ch === "\\") {
    console.log("string escape detected");
    state = "string_escape";
    return;
  } else if (ch === "\n" || ch === "\r") {
    throw new Error("Unescaped newline in string");
  } else {
    currentValue += ch;
  }
}

export function buildNull(ch) {
  currentValue += ch;
  if (currentValue === "null") {
    appendValueToContainer(null);
  }
}

export function buildBoolean(ch) {
  currentValue += ch;
  if (currentValue === "false") {
    appendValueToContainer(false);
  } else if (currentValue === "true") {
    appendValueToContainer(true);
  }
}

export function buildNumber(ch) {
  if (/[0-9.eE+-]/.test(ch)) {
    currentValue += ch;
    return;
  }

  const number = parseFloat(currentValue);
  const tE = tempJsonStack[tempJsonStack.length - 1];
  if (tE.type === "obj") {
    tE.container[currentKey] = number;
  } else {
    tE.container.push(number);
  }
  currentKey = "";
  currentValue = "";

  state = "after_value";
  afterValue(ch);
}

export function afterValue(ch) {
  if (/\s/.test(ch)) {
    return;
  }

  const containerType = tempJsonStack[tempJsonStack.length - 1].type;

  // handle the case for trailing commas

  if (ch === ",") {
    if (containerType === "obj") {
      state = "after_comma_obj";  // New intermediate state
    } else {
      state = "after_comma_array";  // New intermediate state
    }
    return;
  }

  if (
    ch === "}" &&
    containerType === "obj" &&
    parenthesisStack[parenthesisStack.length - 1] === "{"
  ) {
    parenthesisStack.pop();
    const poppedElement = tempJsonStack.pop();
    if (tempJsonStack.length > 0) {
      state = "after_value";
    }
    return;
  }

  if (
    ch === "]" &&
    containerType === "array" &&
    parenthesisStack[parenthesisStack.length - 1] === "["
  ) {
    parenthesisStack.pop();
    const poppedElement = tempJsonStack.pop();
    if (tempJsonStack.length > 0) {
      state = "after_value";
    }
    return;
  }

  throw new Error(`Expected ',' or '${containerType === "obj" ? "}" : "]"}'`);
}

export function buildingValue(ch) {

    console.log("CUrrent KEY", currentKey);
    console.log("Current VALUE", currentValue);
    console.log("CHAR to process", ch);

    if (/\s/.test(ch)) {
        return
    }

  if (ch === '"') {
    state = "build_string";
    currentValue = "";
    return;
  }

  if (ch === "n") {
    state = "build_null";
    currentValue = ch;
    return;
  }

  if (ch === "t" || ch === "f") {
    state = "build_boolean";
    currentValue = ch;
    return;
  }

  if (/[0-9.eE+-]/.test(ch)) {
    state = "build_number";
    currentValue = ch;
    return;
  }

  if (ch === "{") {
    if(currentKey === "neighbours"){
        console.log("Inside Object");
    }
    const newObj = {};

    if (tempJsonStack.length === 0) {
      parenthesisStack.push("{");
      tempJsonStack.push({
        type: "obj",
        container: tempJson,
      });
      state = "build_key";
      return;
    }

    const tE = tempJsonStack[tempJsonStack.length - 1];

    if (tE.type === "obj") {
      tE.container[currentKey] = newObj;
    } else {
      tE.container.push(newObj);
    }

    parenthesisStack.push("{");
    tempJsonStack.push({
      type: "obj",
      container: newObj,
    });

    state = "build_key";
    return;
  }

  if (ch === "[") {
    const newArr = [];
    const tE = tempJsonStack[tempJsonStack.length - 1];

    if (tE.type === "obj") {
      tE.container[currentKey] = newArr;
    } else {
      tE.container.push(newArr);
    }

    parenthesisStack.push("[");
    tempJsonStack.push({
      type: "array",
      container: newArr,
    });

    state = "expect_value";
    return;
  }

  if (ch !== " ") {
    const message = console.log("Invalid character", ch);
    throw Error("Invalid chracter detected");
  }
}
