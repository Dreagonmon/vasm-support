const SPECIAL_REGISTERS = {
    "r0": 0,
    "rc0": 1,
    "rc1": 2,
    "rc2": 3,
    "rc3": 4,
    "rs0": 112,
    "rs1": 113,
    "rs2": 114,
    "rs3": 115,
    "rs4": 116,
    "rs5": 117,
    "rs6": 118,
    "rs7": 119,
    "rs8": 120,
    "rs9": 121,
    "rs10": 122,
    "rs11": 123,
    "rs12": 124,
    "rs13": 125,
    "rs14": 126,
    "rs15": 127,
};
const REGISTER_BASE = 5;
const REGISTER_CAPACITY = 128 - 16 - 4 - 1;
const INST_ZERO = [
    "NOPE",
    "EXIT",
    "WKEY",
    "GKEY",
    "TICK",
    "SAVE",
    "LOAD",
    "INVI",
    "RETN",
    "RAND",
];
const INST_ONE = [
    "ADDI",
    "SUBI",
    "MULI",
    "DIVI",
    "MODI",
    "JUMP",
    "JPEZ",
    "JPGZ",
    "JPLZ",
    "CALL",
];
const INST_TWO = [
    "STOR",
    "MOVE",
    "DTIL",
    "DNUM",
];
const INST_MANY = [
    "TILE",
    "DTXT",
    "DSEL",
];
const INST_MACRO = [
    // TODO: add macro processer
];

const assert = (check, info) => {
    if (!check) {
        throw new Error(info);
    }
};
const assertIsLabel = (text) => {
    assert(/^l[\w]+$/.test(text), `'${text}' is not a label.`);
};
const assertIsRegister = (text) => {
    assert(/^\*?r[\w]+$/.test(text), `'${text}' is not a register.`);
};
const assertIsNumber = (text) => {
    let passed = true;
    if (text.startsWith("0b")) {
        passed = /^[01]+$/.test(text.substring(2));
    } else if (text.startsWith("0x")) {
        passed = /^[0-9a-fA-F]+$/.test(text.substring(2));
    } else if (text.startsWith("&")) {
        passed = text.substring(1).startsWith("r");
    } else {
        passed = /^[0-9]+$/.test(text);
    }
    assert(passed, `'${text}' is not a number.`);
};
const parseNumber = (text) => {
    if (text.startsWith("0b")) {
        return Number.parseInt(text.substring(2), 2) & 0xFF;
    } else if (text.startsWith("0x")) {
        return Number.parseInt(text.substring(2), 16) & 0xFF;
    } else if (text.startsWith("&")) {
        return null;
    } else {
        return Number.parseInt(text, 10) & 0xFF;
    }
};
const assertAndParseAsciiString = (text) => {
    let start = -1;
    let end = -1;
    let p = 0;
    while (p < text.length) {
        const ch = text[ p ];
        if (ch === "\\") {
            p += 2;
            continue;
        }
        if (start < 0 && ch === "\"") {
            start = p + 1;
            p += 1;
            continue;
        } else if (start >= 0 && ch === "\"") {
            end = p;
            p += 1;
            break;
        }
        p += 1;
    }
    if (start < 0 || end < 0) {
        throw new Error(`'${text}' is not a string.`);
    } else {
        const content = text.substring(start, end)
            .replaceAll("\\\"", "\"")
            .replaceAll("\\\'", "\'")
            .replaceAll("\\\t", " ")
            .replaceAll("\\\v", " ")
            .replaceAll("\\\r", " ")
            .replaceAll("\\\n", " ")
            .replaceAll("\\\\", "\\");
        const buffer = new Uint8Array(content.length + 1);
        for (let i = 0; i < content.length; i++) {
            const code = content[ i ].charCodeAt(0);
            if (code < 0x20 || code > 0x7E) {
                throw new Error(`'${text}' is not ascii encoded string.`);
            }
            buffer[ i ] = code;
        }
        buffer[ content.length ] = 0; // '\0'
        return [ p, buffer ];
    }
};

export class VASMCompileError extends Error {
    constructor () {
        super();
        /** @type {Array<number>} */
        this.lines = [];
        /** @type {Array<Error>} */
        this.errors = [];
    }
}

export class Instruction {
    constructor (tag, _params) {
        this.tag = tag;
    }
    updateLabelAddress (_labelName, _address) { }
    updateRegisterNumber (_regName, _regNumber) { }
    getRegisters () { return []; }
    getTag () { return this.tag; }
    getSize () { return 1; }
    getBytes () { return new Uint8Array([ 0x00 ]); }
    toString () {
        return `<${this.tag} size=${this.getSize()}>`;
    }
}

export class InstLabel extends Instruction {
    constructor (tag, params, comments = []) {
        super(tag, params);
        assertIsLabel(tag.substring(1));
        /** @type {string} */
        this.label = tag.substring(1);
        /** @type {Array<string>} */
        this.commants = Array.from(comments);
    }
    getSize () { return 0; }
    getBytes () {
        return new Uint8Array();
    }
}

export class InstZero extends Instruction {
    constructor (tag, params) {
        super(tag, params);
    }
    getSize () { return 1; }
    getBytes () {
        const inst = {
            "NOPE": 0x00,
            "EXIT": 0x01,
            "WKEY": 0x02,
            "GKEY": 0x03,
            "TICK": 0x04,
            "SAVE": 0x05,
            "LOAD": 0x06,
            "INVI": 0x0F,
            "RETN": 0x15,
            "RAND": 0x1A,
        }[ this.tag ];
        return new Uint8Array([ inst ]);
    }
}

export class InstOne extends Instruction {
    constructor (tag, params) {
        super(tag, params);
        this.label = params;
        this.value = null;
        if (this.paramIsAddr()) {
            assertIsLabel(params);
        } else if (this.paramIsReg()) {
            assertIsRegister(params);
        }
    }
    paramIsReg () {
        return [
            "ADDI",
            "SUBI",
            "MULI",
            "DIVI",
            "MODI",
        ].includes(this.tag);
    }
    paramIsAddr () {
        return [
            "JUMP",
            "JPEZ",
            "JPGZ",
            "JPLZ",
            "CALL",
        ].includes(this.tag);
    }
    updateLabelAddress (label, addr) {
        if (this.paramIsAddr() && label === this.label) {
            this.value = addr;
        }
    }
    updateRegisterNumber (reg, num) {
        if (this.paramIsReg() && reg === this.label) {
            this.value = num;
        }
    }
    getRegisters () {
        if (this.paramIsReg()) {
            return [ this.label ];
        }
        return [];
    }
    getSize () {
        if (this.paramIsReg()) {
            return 2;
        } else if (this.paramIsAddr()) {
            return 3;
        }
    }
    getBytes () {
        assert(this.value !== null, `Could not resolve '${this.label}'`);
        const inst = {
            "ADDI": 0x0A,
            "SUBI": 0x0B,
            "MULI": 0x0C,
            "DIVI": 0x0D,
            "MODI": 0x0E,
            "JUMP": 0x10,
            "JPEZ": 0x11,
            "JPGZ": 0x12,
            "JPLZ": 0x13,
            "CALL": 0x14,
        }[ this.tag ];
        if (this.paramIsAddr()) {
            assert(this.value >= 0 && this.value <= 0xFFFF, `Address '${this.label}' out of range.`);
            return new Uint8Array([ inst, (this.value >> 8) & 0xFF, this.value & 0xFF ]);
        } else if (this.paramIsReg()) {
            assert(this.value >= 0 && this.value <= 0x7F, `Register '${this.label}' out of range.`);
            return new Uint8Array([ inst, this.value & 0xFF ]);
        } else {
            throw new Error(`Unsupport '${this.tag}'`);
        }
    }
}

export class InstTwo extends Instruction {
    constructor (tag, params) {
        super(tag, params);
        const param_list = params.split(/\s+/);
        assert(param_list.length === 2, `'${tag}' requires 2 parameters.`);
        this.param1 = param_list[ 0 ];
        this.param2 = param_list[ 1 ];
        this.value1 = null;
        this.value2 = null;
        if ([ "STOR" ].includes(tag)) {
            assertIsNumber(this.param1);
            this.value1 = parseNumber(this.param1);
        } else {
            assertIsRegister(this.param1);
        }
        assertIsRegister(this.param2);
    }
    updateRegisterNumber (reg, num) {
        if ([ "STOR" ].includes(this.tag)) {
            if (this.param1.startsWith("&") && reg === this.param1) {
                this.value1 = num;
            }
        } else {
            if (reg === this.param1) {
                this.value1 = num;
            }
        }
        if (reg === this.param2) {
            this.value2 = num;
        }
    }
    getRegisters () {
        const regs = [];
        if ([ "STOR" ].includes(this.tag)) {
            if (this.param1.startsWith("&")) {
                regs.push(this.param1);
            }
        } else {
            regs.push(this.param1);
        }
        regs.push(this.param2);
        return regs;
    }
    getSize () {
        return 3;
    }
    getBytes () {
        assert(this.value1 !== null, `Could not resolve '${this.param1}'`);
        assert(this.value2 !== null, `Could not resolve '${this.param2}'`);
        const inst = {
            "STOR": 0x08,
            "MOVE": 0x09,
            "DTIL": 0x16,
            "DNUM": 0x17,
        }[ this.tag ];
        return new Uint8Array([ inst, this.value1 & 0xFF, this.value2 & 0xFF ]);
    }
}

export class InstMany extends Instruction {
    constructor (tag, params) {
        super(tag, params);
        this.label = null;
        this.value = null;
        if (tag === "TILE") {
            const param_list = params.split(/\s+/);
            assert(param_list.length === 9, `'${tag}' requires 9 parameters.`);
            this.label = param_list[ 0 ];
            assertIsNumber(this.label);
            const value = parseNumber(this.label);
            assert(value !== null && value >= 0 && value <= 63, `${this.label} out of range [0, 63].`);
            this.value = value;
            this.buffer = new Uint8Array(8);
            for (let i = 1; i < 9; i++) {
                assertIsNumber(param_list[ i ]);
                const value = parseNumber(param_list[ i ]);
                assert(value !== null, `'${param_list[ i ]}' is not a number.`);
                this.buffer[ i - 1 ] = value;
            }
            this.size = 10;
        } else if (tag === "DTXT") {
            const reg = params.split(/\s+/)[ 0 ];
            assertIsRegister(reg);
            this.label = reg;
            const [ _, buffer ] = assertAndParseAsciiString(params);
            assert(buffer.length <= 128, "String is too large.");
            this.buffer = buffer;
            this.size = buffer.length + 2;
        } else if (tag === "DSEL") {
            const reg = params.split(/\s+/)[ 0 ];
            assertIsRegister(reg);
            this.label = reg;
            let offset = 0;
            const buffers = [];
            while (offset < params.length) {
                const [ size, buffer ] = assertAndParseAsciiString(params.substring(offset));
                buffers.push(buffer);
                offset += size;
            }
            const bufferSize = buffers.reduce((pv, c) => {
                return pv + c.length;
            }, 0);
            offset = 0;
            const buffer = new Uint8Array(bufferSize + 1);
            assert(buffer.length <= 128, "String is too large.");
            for (const buf of buffers) {
                buffer.set(buf, offset);
                offset += buf.length;
            }
            buffer[ bufferSize ] = 0; // '\0'
            this.buffer = buffer;
            this.size = buffer.length + 2;
        } else {
            this.buffer = new Uint8Array();
            this.size = 0;
        }
    }
    updateRegisterNumber (reg, num) {
        if ([ "DTXT", "DSEL" ].includes(this.tag) && reg === this.label) {
            this.value = num;
        }
    }
    getRegisters () {
        if (this.tag === "TILE") {
            return [];
        }
        return [ this.label ];
    }
    getSize () {
        return this.size;
    }
    getBytes () {
        assert(this.value !== null, `Could not resolve '${this.label}'`);
        const inst = {
            "TILE": 0x07,
            "DTXT": 0x18,
            "DSEL": 0x19,
        }[ this.tag ];
        const buffer = new Uint8Array(this.getSize());
        buffer[ 0 ] = inst;
        buffer[ 1 ] = this.value;
        buffer.set(this.buffer, 2);
        return buffer;
    }
}

/**
 * process one line of text
 * @param {string} text 
 * @param {Array<Instruction>} instructions 
 * @param {Array<string>} commants 
 */
const process_line = (text, instructions, commants) => {
    const tag = /([\:\@]?.+?)\b(.*)/.exec(text)[ 1 ];
    if (tag) {
        const utag = tag.toUpperCase();
        const params = text.substring(tag.length).trim();
        if (INST_ZERO.includes(utag)) {
            instructions.push(new InstZero(utag, params));
        } else if (INST_ONE.includes(utag)) {
            instructions.push(new InstOne(utag, params));
        } else if (INST_TWO.includes(utag)) {
            instructions.push(new InstTwo(utag, params));
        } else if (INST_MANY.includes(utag)) {
            instructions.push(new InstMany(utag, params));
        } else if (INST_MACRO.includes(utag)) {
            // TODO: add macro processer
        } else if (tag.startsWith(":")) {
            instructions.push(new InstLabel(tag, params, commants));
        } else {
            throw new Error(`Unknown instruction: ${text}`);
        }
    } else {
        throw new Error(`Missing instruction`);
    }
};

/**
 * read file into instructions
 * @param {string} file_content 
 * @param {Array<Instruction>} instructions 
 * @throws {VASMCompileError} Compile Error
 */
export const processFileContent = (file_content, instructions) => {
    const eLineNum = [];
    const eError = [];
    const commants = [];
    let hasError = false;
    let line = 0;
    for (const value of file_content.split("\n")) {
        const comment_index = value.indexOf(";");
        // add comments
        if (comment_index >= 0) {
            const com = value.substring(comment_index + 1);
            const isLeadingBySpace = /^\s\S+/.exec(com);
            if (isLeadingBySpace) {
                commants.push(com.substring(1));
            } else {
                commants.push(com);
            }
        }
        const last_index = (comment_index >= 0) ? comment_index : value.length;
        const text_line = value.substring(0, last_index).trim();
        if (text_line.length > 0) {
            try {
                process_line(text_line, instructions, commants);
            } catch (err) {
                eLineNum.push(line);
                eError.push(err);
                hasError = true;
            }
            // clear comments if any instruction exist.
            commants.splice(0, commants.length);
        }
        if (value.trim().length <= 0) {
            // clear comments if line is empty.
            commants.splice(0, commants.length);
        }
        line += 1;
    }
    if (hasError) {
        const err = new VASMCompileError();
        err.lines = eLineNum;
        err.errors = eError;
        throw err;
    }
};

/**
 * process registers
 * @param {Array<Instruction>} instructions 
 */
export const processRegisters = (instructions) => {
    // update default registers
    for (const reg in SPECIAL_REGISTERS) {
        instructions.forEach((ainst) => {
            ainst.updateRegisterNumber(reg, SPECIAL_REGISTERS[ reg ]);
            ainst.updateRegisterNumber(`&${reg}`, SPECIAL_REGISTERS[ reg ]);
            ainst.updateRegisterNumber(`*${reg}`, SPECIAL_REGISTERS[ reg ] + 128);
        });
    }
    // collect all registers
    const regs = new Set();
    instructions.forEach((inst) => {
        for (let reg of inst.getRegisters()) {
            if (reg.startsWith("*") || reg.startsWith("&")) {
                reg = reg.substring(1);
            } else {
                // keep
            }
            if (!(reg in SPECIAL_REGISTERS)) {
                regs.add(reg);
            }
        }
    });
    assert(regs.size <= REGISTER_CAPACITY, "Too many registers.");
    const sortedRegs = Array.from(regs);
    sortedRegs.sort();
    // update registers
    let regnum = REGISTER_BASE;
    for (const reg of regs) {
        instructions.forEach((ainst) => {
            ainst.updateRegisterNumber(reg, regnum);
            ainst.updateRegisterNumber(`&${reg}`, regnum);
            ainst.updateRegisterNumber(`*${reg}`, regnum + 128);
        });
        regnum += 1;
    }
};

/**
 * process labels
 * @param {Array<Instruction>} instructions 
 */
export const processLabels = (instructions) => {
    let offset = 0;
    instructions.forEach((inst) => {
        if (inst instanceof InstLabel) {
            // update all label position
            instructions.forEach((ainst) => {
                ainst.updateLabelAddress(inst.label, offset);
            });
        }
        offset += inst.getSize();
        if (offset > 0xFFFF) {
            throw new Error("Too many instructions.");
        }
    });
};

/**
 * build binary
 * @param {Array<Instruction>} instructions 
 * @returns {Uint8Array}
 */
export const buildBinary = (instructions) => {
    const parts = [];
    let len = 0;
    for (const ainst of instructions) {
        const part = ainst.getBytes();
        len += part.length;
        parts.push(part);
    }
    const data = new Uint8Array(len);
    len = 0;
    for (const part of parts) {
        data.set(part, len);
        len += part.length;
    }
    return data;
};

/**
 * get all labels
 * @param {Array<Instruction>} instructions
 * @returns {Array<string>}
 */
export const getAllLabels = (instructions) => {
    const labels = new Set();
    instructions.forEach((inst) => {
        if (inst instanceof InstLabel) {
            // update all label position
            labels.add(inst.label);
        }
    });
    return Array.from(labels);
};

/**
 * get all comments of all labels
 * @param {Array<Instruction>} instructions
 * @returns {Map<string, string>}
 */
export const getAllLabelComments = (instructions) => {
    const commants = new Map();
    instructions.forEach((inst) => {
        if (inst instanceof InstLabel) {
            // update all label position
            const label = inst.label;
            const commant = inst.commants.join("\n");
            commants.set(label, commant);
        }
    });
    return commants;
};

/**
 * get all registers
 * @param {Array<Instruction>} instructions
 * @returns {Array<string>}
 */
export const getAllRegisters = (instructions) => {
    const regs = new Set();
    for (const reg in SPECIAL_REGISTERS) {
        regs.add(reg);
    }
    instructions.forEach((inst) => {
        for (let reg of inst.getRegisters()) {
            if (reg.startsWith("*") || reg.startsWith("&")) {
                reg = reg.substring(1);
            } else {
                // keep
            }
            regs.add(reg);
        }
    });
    return Array.from(regs);
};

const __main__ = async () => {
    const instructions = [];
    const decoder = new TextDecoder("utf-8");
    const file_content = decoder.decode(await Deno.readFile(Deno.args[ 0 ]));
    try {
        processFileContent(file_content, instructions);
    } catch (err) {
        console.log("error");
        for (let i = 0; i < err.lines.length; i++) {
            const line = err.lines[ i ] + 1;
            const errMsg = err.errors[ i ];
            console.error(`> Line ${line}: ${errMsg}`);
            console.error(`  at (file://${await Deno.realPath(Deno.args[ 0 ])}:${line}:0)`);
        }
    }
    processRegisters(instructions);
    processLabels(instructions);
    await Deno.writeFile("./a.out", buildBinary(instructions));
};

if (import.meta.main) {
    __main__();
}
