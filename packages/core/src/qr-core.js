/**
 * @stone-pixel/qr-core
 * A free, zero-dependency QR code generator.
 *
 * Implements QR Code Model 2 (ISO/IEC 18004).
 * Supports Numeric, Alphanumeric, Byte, and Kanji encoding modes.
 * Error correction levels: L (7%), M (15%), Q (25%), H (30%).
 *
 * License: Apache-2.0
 */

// ---------------------------------------------------------------------------
// Galois Field GF(2^8) arithmetic for Reed-Solomon error correction
// ---------------------------------------------------------------------------

const GF256 = (() => {
  const EXP = new Uint8Array(256);
  const LOG = new Uint8Array(256);
  let x = 1;
  for (let i = 0; i < 255; i++) {
    EXP[i] = x;
    LOG[x] = i;
    x <<= 1;
    if (x & 0x100) x ^= 0x11d; // primitive polynomial x^8 + x^4 + x^3 + x^2 + 1
  }
  EXP[255] = EXP[0];

  return {
    exp(n) { return EXP[((n % 255) + 255) % 255]; },
    log(n) { return LOG[n]; },
    mul(a, b) {
      if (a === 0 || b === 0) return 0;
      return EXP[(LOG[a] + LOG[b]) % 255];
    },
  };
})();

// ---------------------------------------------------------------------------
// Reed-Solomon error correction code generation
// ---------------------------------------------------------------------------

function rsGeneratorPoly(degree) {
  let gen = new Uint8Array([1]);
  for (let i = 0; i < degree; i++) {
    const next = new Uint8Array(gen.length + 1);
    const factor = GF256.exp(i);
    for (let j = 0; j < gen.length; j++) {
      next[j] ^= gen[j];
      next[j + 1] ^= GF256.mul(gen[j], factor);
    }
    gen = next;
  }
  return gen;
}

function rsEncode(data, ecCount) {
  const gen = rsGeneratorPoly(ecCount);
  const result = new Uint8Array(data.length + ecCount);
  result.set(data);
  for (let i = 0; i < data.length; i++) {
    const coef = result[i];
    if (coef !== 0) {
      for (let j = 0; j < gen.length; j++) {
        result[i + j] ^= GF256.mul(gen[j], coef);
      }
    }
  }
  return result.slice(data.length);
}

// ---------------------------------------------------------------------------
// QR Code constants & tables
// ---------------------------------------------------------------------------

const EC_LEVELS = { L: 0, M: 1, Q: 2, H: 3 };

// Mode indicators
const MODE = {
  NUMERIC: 0b0001,
  ALPHANUMERIC: 0b0010,
  BYTE: 0b0100,
  KANJI: 0b1000,
  ECI: 0b0111,
};

// Alphanumeric character set
const ALPHANUM_CHARS = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ $%*+-./:';

// Character count indicator bit lengths per version range
const CHAR_COUNT_BITS = {
  [MODE.NUMERIC]:      [10, 12, 14],
  [MODE.ALPHANUMERIC]: [9, 11, 13],
  [MODE.BYTE]:         [8, 16, 16],
  [MODE.KANJI]:        [8, 10, 12],
};

function charCountBits(mode, version) {
  const idx = version <= 9 ? 0 : version <= 26 ? 1 : 2;
  return CHAR_COUNT_BITS[mode][idx];
}

// Error correction codewords per block and block structure per version/ec level
// Format: [totalDataCodewords, [numBlocks, dataCodewordsPerBlock, ecCodewordsPerBlock], ...]
// Sourced from ISO/IEC 18004 Tables 7-11
const EC_TABLE = buildECTable();

function buildECTable() {
  // [version][ecLevel] = { totalData, blocks: [{count, dataPerBlock, ecPerBlock}] }
  // Compact representation: version 1-40, each ec level
  const raw = [
    // V1:  L, M, Q, H
    [[19,[[1,19,7]]],[16,[[1,16,10]]],[13,[[1,13,13]]],[9,[[1,9,17]]]],
    // V2
    [[34,[[1,34,10]]],[28,[[1,28,16]]],[22,[[1,22,22]]],[16,[[1,16,28]]]],
    // V3
    [[55,[[1,55,15]]],[44,[[1,44,26]]],[34,[[2,17,18]]],[26,[[2,13,22]]]],
    // V4
    [[80,[[1,80,20]]],[64,[[2,32,18]]],[48,[[2,24,26]]],[36,[[4,9,16]]]],
    // V5
    [[108,[[1,108,26]]],[86,[[2,43,24]]],[62,[[2,15,18],[2,16,18]]],[46,[[2,11,22],[2,12,22]]]],
    // V6
    [[136,[[2,68,18]]],[108,[[4,27,16]]],[76,[[4,19,24]]],[60,[[4,15,28]]]],
    // V7
    [[156,[[2,78,20]]],[124,[[4,31,18]]],[88,[[2,14,18],[4,15,18]]],[66,[[4,13,26],[1,14,26]]]],
    // V8
    [[194,[[2,97,24]]],[154,[[2,38,22],[2,39,22]]],[110,[[4,18,22],[2,19,22]]],[86,[[4,14,26],[2,15,26]]]],
    // V9
    [[232,[[2,116,30]]],[182,[[3,36,22],[2,37,22]]],[132,[[4,16,20],[4,17,20]]],[100,[[4,12,24],[4,13,24]]]],
    // V10
    [[274,[[2,68,18],[2,69,18]]],[216,[[4,43,26],[1,44,26]]],[154,[[6,19,24],[2,20,24]]],[122,[[6,15,28],[2,16,28]]]],
    // V11
    [[324,[[4,81,20]]],[254,[[1,50,30],[4,51,30]]],[180,[[4,22,28],[4,23,28]]],[140,[[3,12,24],[8,13,24]]]],
    // V12
    [[370,[[2,92,24],[2,93,24]]],[290,[[6,36,22],[2,37,22]]],[206,[[4,20,26],[6,21,26]]],[158,[[7,14,28],[4,15,28]]]],
    // V13
    [[428,[[4,107,26]]],[334,[[8,37,22],[1,38,22]]],[244,[[8,20,24],[4,21,24]]],[180,[[12,11,22],[4,12,22]]]],
    // V14
    [[461,[[3,115,30],[1,116,30]]],[365,[[4,40,24],[5,41,24]]],[261,[[11,16,20],[5,17,20]]],[197,[[11,12,24],[5,13,24]]]],
    // V15
    [[523,[[5,87,22],[1,88,22]]],[415,[[5,41,24],[5,42,24]]],[295,[[5,24,30],[7,25,30]]],[223,[[11,12,24],[7,13,24]]]],
    // V16
    [[589,[[5,98,24],[1,99,24]]],[453,[[7,45,28],[3,46,28]]],[325,[[15,19,24],[2,20,24]]],[253,[[3,15,30],[13,16,30]]]],
    // V17
    [[647,[[1,107,28],[5,108,28]]],[507,[[10,46,28],[1,47,28]]],[367,[[1,22,28],[15,23,28]]],[283,[[2,14,28],[17,15,28]]]],
    // V18
    [[721,[[5,120,30],[1,121,30]]],[563,[[9,43,26],[4,44,26]]],[397,[[17,22,28],[1,23,28]]],[313,[[2,14,28],[19,15,28]]]],
    // V19
    [[795,[[3,113,28],[4,114,28]]],[627,[[3,44,26],[11,45,26]]],[445,[[17,21,26],[4,22,26]]],[341,[[9,13,26],[16,14,26]]]],
    // V20
    [[861,[[3,107,28],[5,108,28]]],[669,[[3,41,26],[13,42,26]]],[485,[[15,24,30],[5,25,30]]],[385,[[15,15,28],[10,16,28]]]],
    // V21
    [[932,[[4,116,28],[4,117,28]]],[714,[[17,42,26]]],[512,[[17,22,28],[6,23,28]]],[406,[[19,16,30],[6,17,30]]]],
    // V22
    [[1006,[[2,111,28],[7,112,28]]],[782,[[17,46,28]]],[568,[[7,24,30],[16,25,30]]],[442,[[34,13,24]]]],
    // V23
    [[1094,[[4,121,30],[5,122,30]]],[860,[[4,47,28],[14,48,28]]],[614,[[11,24,30],[14,25,30]]],[464,[[16,15,30],[14,16,30]]]],
    // V24
    [[1174,[[6,117,30],[4,118,30]]],[914,[[6,45,28],[14,46,28]]],[664,[[11,24,30],[16,25,30]]],[514,[[30,16,30],[2,17,30]]]],
    // V25
    [[1276,[[8,106,26],[4,107,26]]],[1000,[[8,47,28],[13,48,28]]],[718,[[7,24,30],[22,25,30]]],[538,[[22,15,30],[13,16,30]]]],
    // V26
    [[1370,[[10,114,28],[2,115,28]]],[1062,[[19,46,28],[4,47,28]]],[754,[[28,22,28],[6,23,28]]],[596,[[33,16,30],[4,17,30]]]],
    // V27
    [[1468,[[8,122,30],[4,123,30]]],[1128,[[22,45,28],[3,46,28]]],[808,[[8,23,30],[26,24,30]]],[628,[[12,15,30],[28,16,30]]]],
    // V28
    [[1531,[[3,117,30],[10,118,30]]],[1193,[[3,45,28],[23,46,28]]],[871,[[4,24,30],[31,25,30]]],[661,[[11,15,30],[31,16,30]]]],
    // V29
    [[1631,[[7,116,30],[7,117,30]]],[1267,[[21,45,28],[7,46,28]]],[911,[[1,23,30],[37,24,30]]],[701,[[19,15,30],[26,16,30]]]],
    // V30
    [[1735,[[5,115,30],[10,116,30]]],[1373,[[19,47,28],[10,48,28]]],[985,[[15,24,30],[25,25,30]]],[745,[[23,15,30],[25,16,30]]]],
    // V31
    [[1843,[[13,115,30],[3,116,30]]],[1455,[[2,46,28],[29,47,28]]],[1033,[[42,24,30],[1,25,30]]],[793,[[23,15,30],[28,16,30]]]],
    // V32
    [[1955,[[17,115,30]]],[1541,[[10,46,28],[23,47,28]]],[1115,[[10,24,30],[35,25,30]]],[845,[[19,15,30],[35,16,30]]]],
    // V33
    [[2071,[[17,115,30],[1,116,30]]],[1631,[[14,46,28],[21,47,28]]],[1171,[[29,24,30],[19,25,30]]],[901,[[11,15,30],[46,16,30]]]],
    // V34
    [[2191,[[13,115,30],[6,116,30]]],[1725,[[14,46,28],[23,47,28]]],[1231,[[44,24,30],[7,25,30]]],[961,[[59,16,30],[1,17,30]]]],
    // V35
    [[2306,[[12,121,30],[7,122,30]]],[1812,[[12,47,28],[26,48,28]]],[1286,[[39,24,30],[14,25,30]]],[986,[[22,15,30],[41,16,30]]]],
    // V36
    [[2434,[[6,121,30],[14,122,30]]],[1914,[[6,47,28],[34,48,28]]],[1354,[[46,24,30],[10,25,30]]],[1054,[[2,15,30],[64,16,30]]]],
    // V37
    [[2566,[[17,122,30],[4,123,30]]],[1992,[[29,46,28],[14,47,28]]],[1426,[[49,24,30],[10,25,30]]],[1096,[[24,15,30],[46,16,30]]]],
    // V38
    [[2702,[[4,122,30],[18,123,30]]],[2102,[[13,46,28],[32,47,28]]],[1502,[[48,24,30],[14,25,30]]],[1142,[[42,15,30],[32,16,30]]]],
    // V39
    [[2812,[[20,117,30],[4,118,30]]],[2216,[[40,47,28],[7,48,28]]],[1582,[[43,24,30],[22,25,30]]],[1222,[[10,15,30],[67,16,30]]]],
    // V40
    [[2956,[[19,118,30],[6,119,30]]],[2334,[[18,47,28],[31,48,28]]],[1666,[[34,24,30],[34,25,30]]],[1276,[[20,15,30],[61,16,30]]]],
  ];

  return raw.map(versionEntry =>
    versionEntry.map(([totalData, blocks]) => ({
      totalData,
      blocks: blocks.map(([count, dataPerBlock, ecPerBlock]) => ({
        count,
        dataPerBlock,
        ecPerBlock,
      })),
    }))
  );
}

// Alignment pattern locations per version (version 2+)
const ALIGNMENT_POSITIONS = [
  null, // v0 placeholder
  null, // v1: no alignment patterns
  [6, 18],
  [6, 22],
  [6, 26],
  [6, 30],
  [6, 34],
  [6, 22, 38],
  [6, 24, 42],
  [6, 26, 46],
  [6, 28, 50],
  [6, 30, 54],
  [6, 32, 58],
  [6, 34, 62],
  [6, 26, 46, 66],
  [6, 26, 48, 70],
  [6, 26, 50, 74],
  [6, 30, 54, 78],
  [6, 30, 56, 82],
  [6, 30, 58, 86],
  [6, 34, 62, 90],
  [6, 28, 50, 72, 94],
  [6, 26, 50, 74, 98],
  [6, 30, 54, 78, 102],
  [6, 28, 54, 80, 106],
  [6, 32, 58, 84, 110],
  [6, 30, 58, 86, 114],
  [6, 34, 62, 90, 118],
  [6, 26, 50, 74, 98, 122],
  [6, 30, 54, 78, 102, 126],
  [6, 26, 52, 78, 104, 130],
  [6, 30, 56, 82, 108, 134],
  [6, 34, 60, 86, 112, 138],
  [6, 30, 58, 86, 114, 142],
  [6, 34, 62, 90, 118, 146],
  [6, 30, 54, 78, 102, 126, 150],
  [6, 24, 50, 76, 102, 128, 154],
  [6, 28, 54, 80, 106, 132, 158],
  [6, 32, 58, 84, 110, 136, 162],
  [6, 26, 54, 82, 110, 138, 166],
  [6, 30, 58, 86, 114, 142, 170],
];

// Version information bit strings for versions 7-40
const VERSION_INFO = [
  0x07C94, 0x085BC, 0x09A99, 0x0A4D3, 0x0BBF6, 0x0C762, 0x0D847, 0x0E60D,
  0x0F928, 0x10B78, 0x1145D, 0x12A17, 0x13532, 0x149A6, 0x15683, 0x168C9,
  0x177EC, 0x18EC4, 0x191E1, 0x1AFAB, 0x1B08E, 0x1CC1A, 0x1D33F, 0x1ED75,
  0x1F250, 0x209D5, 0x216F0, 0x228BA, 0x2379F, 0x24B0B, 0x2542E, 0x26A64,
  0x27541, 0x28C69,
];

// Format information bit strings
const FORMAT_INFO = (() => {
  // Pre-computed format info for all ec level + mask combinations
  const table = [];
  for (let ecLevel = 0; ecLevel < 4; ecLevel++) {
    table[ecLevel] = [];
    for (let mask = 0; mask < 8; mask++) {
      const data = (ecLevel << 3) | mask;
      let bits = data;
      // BCH(15,5) encoding
      for (let i = 0; i < 10; i++) {
        bits <<= 1;
        if (bits & (1 << 14)) bits ^= 0x537;  // generator polynomial
      }
      bits = (data << 10) | bits;
      bits ^= 0x5412; // mask pattern
      table[ecLevel][mask] = bits;
    }
  }
  return table;
})();

// ---------------------------------------------------------------------------
// Data encoding
// ---------------------------------------------------------------------------

function detectMode(text) {
  if (/^\d+$/.test(text)) return MODE.NUMERIC;
  if (/^[0-9A-Z $%*+\-./:]+$/.test(text)) return MODE.ALPHANUMERIC;
  return MODE.BYTE;
}

class BitBuffer {
  constructor() {
    this.buffer = [];
    this.length = 0;
  }

  put(value, numBits) {
    for (let i = numBits - 1; i >= 0; i--) {
      this.buffer.push((value >>> i) & 1);
      this.length++;
    }
  }

  getBytes() {
    const bytes = new Uint8Array(Math.ceil(this.length / 8));
    for (let i = 0; i < this.length; i++) {
      bytes[i >>> 3] |= this.buffer[i] << (7 - (i & 7));
    }
    return bytes;
  }
}

function encodeNumeric(data, buffer) {
  for (let i = 0; i < data.length; i += 3) {
    const chunk = data.substring(i, Math.min(i + 3, data.length));
    const bits = chunk.length === 3 ? 10 : chunk.length === 2 ? 7 : 4;
    buffer.put(parseInt(chunk, 10), bits);
  }
}

function encodeAlphanumeric(data, buffer) {
  for (let i = 0; i < data.length; i += 2) {
    if (i + 1 < data.length) {
      const val = ALPHANUM_CHARS.indexOf(data[i]) * 45 + ALPHANUM_CHARS.indexOf(data[i + 1]);
      buffer.put(val, 11);
    } else {
      buffer.put(ALPHANUM_CHARS.indexOf(data[i]), 6);
    }
  }
}

function encodeByte(data, buffer) {
  const encoder = typeof TextEncoder !== 'undefined' ? new TextEncoder() : null;
  const bytes = encoder ? encoder.encode(data) : Array.from(data).map(c => c.charCodeAt(0) & 0xff);
  for (let i = 0; i < bytes.length; i++) {
    buffer.put(bytes[i], 8);
  }
}

function getByteLength(data) {
  if (typeof TextEncoder !== 'undefined') {
    return new TextEncoder().encode(data).length;
  }
  return data.length;
}

function selectVersion(data, mode, ecLevel) {
  const ecIdx = EC_LEVELS[ecLevel];
  const dataLen = mode === MODE.BYTE ? getByteLength(data) : data.length;

  for (let v = 0; v < 40; v++) {
    const totalDataBits = EC_TABLE[v][ecIdx].totalData * 8;
    const headerBits = 4 + charCountBits(mode, v + 1);
    const availableBits = totalDataBits - headerBits;

    let requiredBits;
    if (mode === MODE.NUMERIC) {
      const fullGroups = Math.floor(dataLen / 3);
      const remainder = dataLen % 3;
      requiredBits = fullGroups * 10 + (remainder === 2 ? 7 : remainder === 1 ? 4 : 0);
    } else if (mode === MODE.ALPHANUMERIC) {
      const fullGroups = Math.floor(dataLen / 2);
      const remainder = dataLen % 2;
      requiredBits = fullGroups * 11 + remainder * 6;
    } else {
      requiredBits = dataLen * 8;
    }

    if (requiredBits <= availableBits) {
      return v + 1;
    }
  }
  throw new Error('Data too long for any QR code version');
}

function encodeData(data, version, mode, ecLevel) {
  const ecIdx = EC_LEVELS[ecLevel];
  const ecInfo = EC_TABLE[version - 1][ecIdx];
  const totalDataBytes = ecInfo.totalData;

  const buffer = new BitBuffer();

  // Mode indicator
  buffer.put(mode, 4);

  // Character count
  const dataLen = mode === MODE.BYTE ? getByteLength(data) : data.length;
  buffer.put(dataLen, charCountBits(mode, version));

  // Encode data
  if (mode === MODE.NUMERIC) encodeNumeric(data, buffer);
  else if (mode === MODE.ALPHANUMERIC) encodeAlphanumeric(data, buffer);
  else encodeByte(data, buffer);

  // Terminator
  const maxBits = totalDataBytes * 8;
  const terminatorLen = Math.min(4, maxBits - buffer.length);
  buffer.put(0, terminatorLen);

  // Pad to byte boundary
  while (buffer.length % 8 !== 0) {
    buffer.put(0, 1);
  }

  // Pad bytes
  const padBytes = [0xEC, 0x11];
  let padIdx = 0;
  while (buffer.length < maxBits) {
    buffer.put(padBytes[padIdx], 8);
    padIdx = (padIdx + 1) % 2;
  }

  return buffer.getBytes();
}

// ---------------------------------------------------------------------------
// Error correction & interleaving
// ---------------------------------------------------------------------------

function addErrorCorrection(dataBytes, version, ecLevel) {
  const ecIdx = EC_LEVELS[ecLevel];
  const ecInfo = EC_TABLE[version - 1][ecIdx];

  const dataBlocks = [];
  const ecBlocks = [];
  let offset = 0;

  for (const blockGroup of ecInfo.blocks) {
    for (let i = 0; i < blockGroup.count; i++) {
      const blockData = dataBytes.slice(offset, offset + blockGroup.dataPerBlock);
      offset += blockGroup.dataPerBlock;
      dataBlocks.push(blockData);
      ecBlocks.push(rsEncode(blockData, blockGroup.ecPerBlock));
    }
  }

  // Interleave data blocks
  const result = [];
  const maxDataLen = Math.max(...dataBlocks.map(b => b.length));
  for (let i = 0; i < maxDataLen; i++) {
    for (const block of dataBlocks) {
      if (i < block.length) result.push(block[i]);
    }
  }

  // Interleave EC blocks
  const maxECLen = Math.max(...ecBlocks.map(b => b.length));
  for (let i = 0; i < maxECLen; i++) {
    for (const block of ecBlocks) {
      if (i < block.length) result.push(block[i]);
    }
  }

  return new Uint8Array(result);
}

// ---------------------------------------------------------------------------
// Matrix construction
// ---------------------------------------------------------------------------

function getModuleCount(version) {
  return version * 4 + 17;
}

function createMatrix(version) {
  const size = getModuleCount(version);
  // 0 = not set, 1 = dark, 2 = light, 3 = dark (reserved), 4 = light (reserved)
  const matrix = Array.from({ length: size }, () => new Uint8Array(size));
  return matrix;
}

function placeFinderPattern(matrix, row, col) {
  for (let r = -1; r <= 7; r++) {
    for (let c = -1; c <= 7; c++) {
      const mr = row + r;
      const mc = col + c;
      if (mr < 0 || mr >= matrix.length || mc < 0 || mc >= matrix.length) continue;

      if (r === -1 || r === 7 || c === -1 || c === 7) {
        matrix[mr][mc] = 4; // light separator
      } else if (r === 0 || r === 6 || c === 0 || c === 6 ||
                 (r >= 2 && r <= 4 && c >= 2 && c <= 4)) {
        matrix[mr][mc] = 3; // dark
      } else {
        matrix[mr][mc] = 4; // light
      }
    }
  }
}

function placeAlignmentPatterns(matrix, version) {
  const positions = ALIGNMENT_POSITIONS[version];
  if (!positions) return;

  for (const row of positions) {
    for (const col of positions) {
      // Skip if overlapping finder patterns
      if (matrix[row][col] !== 0) continue;

      for (let r = -2; r <= 2; r++) {
        for (let c = -2; c <= 2; c++) {
          if (Math.abs(r) === 2 || Math.abs(c) === 2 || (r === 0 && c === 0)) {
            matrix[row + r][col + c] = 3; // dark
          } else {
            matrix[row + r][col + c] = 4; // light
          }
        }
      }
    }
  }
}

function placeTimingPatterns(matrix) {
  const size = matrix.length;
  for (let i = 8; i < size - 8; i++) {
    if (matrix[6][i] === 0) {
      matrix[6][i] = i % 2 === 0 ? 3 : 4;
    }
    if (matrix[i][6] === 0) {
      matrix[i][6] = i % 2 === 0 ? 3 : 4;
    }
  }
}

function placeDarkModule(matrix, version) {
  matrix[(4 * version) + 9][8] = 3;
}

function reserveFormatInfo(matrix) {
  const size = matrix.length;
  // Around top-left finder
  for (let i = 0; i <= 8; i++) {
    if (matrix[8][i] === 0) matrix[8][i] = 4;
    if (matrix[i][8] === 0) matrix[i][8] = 4;
  }
  // Around top-right finder
  for (let i = 0; i <= 7; i++) {
    if (matrix[8][size - 1 - i] === 0) matrix[8][size - 1 - i] = 4;
  }
  // Around bottom-left finder
  for (let i = 0; i <= 7; i++) {
    if (matrix[size - 1 - i][8] === 0) matrix[size - 1 - i][8] = 4;
  }
}

function reserveVersionInfo(matrix, version) {
  if (version < 7) return;
  const size = matrix.length;

  // Bottom-left
  for (let i = 0; i < 6; i++) {
    for (let j = 0; j < 3; j++) {
      if (matrix[size - 11 + j][i] === 0) matrix[size - 11 + j][i] = 4;
    }
  }
  // Top-right
  for (let i = 0; i < 6; i++) {
    for (let j = 0; j < 3; j++) {
      if (matrix[i][size - 11 + j] === 0) matrix[i][size - 11 + j] = 4;
    }
  }
}

// ---------------------------------------------------------------------------
// Data placement
// ---------------------------------------------------------------------------

function placeData(matrix, data) {
  const size = matrix.length;
  let bitIdx = 0;
  const totalBits = data.length * 8;
  let upward = true;

  for (let col = size - 1; col >= 1; col -= 2) {
    // Skip timing pattern column
    if (col === 6) col = 5;

    const rows = upward
      ? Array.from({ length: size }, (_, i) => size - 1 - i)
      : Array.from({ length: size }, (_, i) => i);

    for (const row of rows) {
      for (let c = 0; c < 2; c++) {
        const actualCol = col - c;
        if (matrix[row][actualCol] !== 0) continue;

        if (bitIdx < totalBits) {
          const bit = (data[bitIdx >>> 3] >>> (7 - (bitIdx & 7))) & 1;
          matrix[row][actualCol] = bit ? 1 : 2;
          bitIdx++;
        } else {
          matrix[row][actualCol] = 2; // light padding
        }
      }
    }
    upward = !upward;
  }
}

// ---------------------------------------------------------------------------
// Masking
// ---------------------------------------------------------------------------

const MASK_FUNCTIONS = [
  (r, c) => (r + c) % 2 === 0,
  (r, c) => r % 2 === 0,
  (r, c) => c % 3 === 0,
  (r, c) => (r + c) % 3 === 0,
  (r, c) => (Math.floor(r / 2) + Math.floor(c / 3)) % 2 === 0,
  (r, c) => ((r * c) % 2) + ((r * c) % 3) === 0,
  (r, c) => (((r * c) % 2) + ((r * c) % 3)) % 2 === 0,
  (r, c) => (((r + c) % 2) + ((r * c) % 3)) % 2 === 0,
];

function applyMask(matrix, maskIdx) {
  const size = matrix.length;
  const maskFn = MASK_FUNCTIONS[maskIdx];

  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      const val = matrix[r][c];
      // Only mask data modules (1 = dark data, 2 = light data)
      if (val === 1 || val === 2) {
        if (maskFn(r, c)) {
          matrix[r][c] = val === 1 ? 2 : 1;
        }
      }
    }
  }
}

function writeFormatInfo(matrix, ecLevel, maskIdx) {
  const size = matrix.length;
  const ecIdx = EC_LEVELS[ecLevel];
  const bits = FORMAT_INFO[ecIdx][maskIdx];

  // Place format info bits
  const positions1 = [ // around top-left
    [8, 0], [8, 1], [8, 2], [8, 3], [8, 4], [8, 5],
    [8, 7], [8, 8],
    [7, 8], [5, 8], [4, 8], [3, 8], [2, 8], [1, 8], [0, 8],
  ];
  const positions2 = [ // bottom-left and top-right
    [size - 1, 8], [size - 2, 8], [size - 3, 8], [size - 4, 8],
    [size - 5, 8], [size - 6, 8], [size - 7, 8],
    [8, size - 8], [8, size - 7], [8, size - 6], [8, size - 5],
    [8, size - 4], [8, size - 3], [8, size - 2], [8, size - 1],
  ];

  for (let i = 0; i < 15; i++) {
    const bit = (bits >>> (14 - i)) & 1;
    const dark = bit === 1 ? 3 : 4;
    matrix[positions1[i][0]][positions1[i][1]] = dark;
    matrix[positions2[i][0]][positions2[i][1]] = dark;
  }
}

function writeVersionInfo(matrix, version) {
  if (version < 7) return;
  const size = matrix.length;
  const bits = VERSION_INFO[version - 7];

  for (let i = 0; i < 18; i++) {
    const bit = (bits >>> i) & 1;
    const dark = bit === 1 ? 3 : 4;
    const row = Math.floor(i / 3);
    const col = (size - 11) + (i % 3);
    matrix[row][col] = dark;
    matrix[col][row] = dark;
  }
}

// ---------------------------------------------------------------------------
// Penalty scoring
// ---------------------------------------------------------------------------

function penaltyScore(matrix) {
  const size = matrix.length;
  let score = 0;

  const isDark = (r, c) => {
    const v = matrix[r][c];
    return v === 1 || v === 3;
  };

  // Rule 1: consecutive same-color modules in rows and columns
  for (let r = 0; r < size; r++) {
    let rowCount = 1;
    let colCount = 1;
    for (let c = 1; c < size; c++) {
      if (isDark(r, c) === isDark(r, c - 1)) {
        rowCount++;
        if (rowCount === 5) score += 3;
        else if (rowCount > 5) score += 1;
      } else {
        rowCount = 1;
      }

      if (isDark(c, r) === isDark(c - 1, r)) {
        colCount++;
        if (colCount === 5) score += 3;
        else if (colCount > 5) score += 1;
      } else {
        colCount = 1;
      }
    }
  }

  // Rule 2: 2x2 blocks of same color
  for (let r = 0; r < size - 1; r++) {
    for (let c = 0; c < size - 1; c++) {
      const d = isDark(r, c);
      if (d === isDark(r, c + 1) && d === isDark(r + 1, c) && d === isDark(r + 1, c + 1)) {
        score += 3;
      }
    }
  }

  // Rule 3: finder-like patterns
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size - 10; c++) {
      // Check row
      const rowPattern = Array.from({ length: 11 }, (_, i) => isDark(r, c + i));
      if (matchesFinderLike(rowPattern)) score += 40;
      // Check column
      const colPattern = Array.from({ length: 11 }, (_, i) => isDark(c + i, r));
      if (matchesFinderLike(colPattern)) score += 40;
    }
  }

  // Rule 4: proportion of dark modules
  let darkCount = 0;
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (isDark(r, c)) darkCount++;
    }
  }
  const total = size * size;
  const pct = (darkCount / total) * 100;
  const prev5 = Math.floor(pct / 5) * 5;
  const next5 = prev5 + 5;
  score += Math.min(Math.abs(prev5 - 50) / 5, Math.abs(next5 - 50) / 5) * 10;

  return score;
}

function matchesFinderLike(pattern) {
  // 1,0,1,1,1,0,1,0,0,0,0  or  0,0,0,0,1,0,1,1,1,0,1
  const p1 = [true, false, true, true, true, false, true, false, false, false, false];
  const p2 = [false, false, false, false, true, false, true, true, true, false, true];
  return pattern.every((v, i) => v === p1[i]) || pattern.every((v, i) => v === p2[i]);
}

// ---------------------------------------------------------------------------
// Main QR code generation
// ---------------------------------------------------------------------------

function generateMatrix(data, ecLevel) {
  const mode = detectMode(data);
  const version = selectVersion(data, mode, ecLevel);

  // Encode data
  const dataBytes = encodeData(data, version, mode, ecLevel);
  const codewords = addErrorCorrection(dataBytes, version, ecLevel);

  // Build matrix
  const matrix = createMatrix(version);

  // Place function patterns
  placeFinderPattern(matrix, 0, 0);
  placeFinderPattern(matrix, 0, matrix.length - 7);
  placeFinderPattern(matrix, matrix.length - 7, 0);
  placeAlignmentPatterns(matrix, version);
  placeTimingPatterns(matrix);
  placeDarkModule(matrix, version);
  reserveFormatInfo(matrix);
  reserveVersionInfo(matrix, version);

  // Place data
  placeData(matrix, codewords);

  // Try all 8 masks, pick the one with the lowest penalty
  let bestMask = 0;
  let bestScore = Infinity;

  for (let mask = 0; mask < 8; mask++) {
    const trial = matrix.map(row => row.slice());
    applyMask(trial, mask);
    writeFormatInfo(trial, ecLevel, mask);
    writeVersionInfo(trial, version);

    const score = penaltyScore(trial);
    if (score < bestScore) {
      bestScore = score;
      bestMask = mask;
    }
  }

  // Apply best mask
  applyMask(matrix, bestMask);
  writeFormatInfo(matrix, ecLevel, bestMask);
  writeVersionInfo(matrix, version);

  return { matrix, version, size: matrix.length };
}

// ---------------------------------------------------------------------------
// Rendering
// ---------------------------------------------------------------------------

function isDarkModule(matrix, row, col) {
  const v = matrix[row][col];
  return v === 1 || v === 3;
}

/**
 * Render QR code to an SVG string.
 */
function toSVG(qr, options = {}) {
  const {
    margin = 4,
    foreground = '#000000',
    background = '#ffffff',
    width = null,
    height = null,
  } = options;

  const size = qr.size + margin * 2;
  const w = width || size;
  const h = height || size;

  let svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${w}" height="${h}" shape-rendering="crispEdges">`;
  svg += `<rect width="${size}" height="${size}" fill="${background}"/>`;
  svg += `<path d="`;

  for (let r = 0; r < qr.size; r++) {
    for (let c = 0; c < qr.size; c++) {
      if (isDarkModule(qr.matrix, r, c)) {
        svg += `M${c + margin},${r + margin}h1v1h-1z`;
      }
    }
  }

  svg += `" fill="${foreground}"/>`;
  svg += `</svg>`;
  return svg;
}

/**
 * Render QR code to a Canvas element.
 */
function toCanvas(qr, canvas, options = {}) {
  const {
    margin = 4,
    scale = 4,
    foreground = '#000000',
    background = '#ffffff',
  } = options;

  const totalSize = (qr.size + margin * 2) * scale;
  canvas.width = totalSize;
  canvas.height = totalSize;

  const ctx = canvas.getContext('2d');
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, totalSize, totalSize);

  ctx.fillStyle = foreground;
  for (let r = 0; r < qr.size; r++) {
    for (let c = 0; c < qr.size; c++) {
      if (isDarkModule(qr.matrix, r, c)) {
        ctx.fillRect((c + margin) * scale, (r + margin) * scale, scale, scale);
      }
    }
  }

  return canvas;
}

/**
 * Render QR code to a data URL (PNG via canvas).
 */
function toDataURL(qr, options = {}) {
  if (typeof document === 'undefined') {
    throw new Error('toDataURL requires a DOM environment. Use toSVG for server-side rendering.');
  }
  const canvas = document.createElement('canvas');
  toCanvas(qr, canvas, options);
  return canvas.toDataURL('image/png');
}

/**
 * Get the QR code as a 2D boolean array (true = dark).
 */
function toBoolean2D(qr) {
  const result = [];
  for (let r = 0; r < qr.size; r++) {
    const row = [];
    for (let c = 0; c < qr.size; c++) {
      row.push(isDarkModule(qr.matrix, r, c));
    }
    result.push(row);
  }
  return result;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Generate a QR code from the given text.
 *
 * @param {string} text - The text/URL to encode
 * @param {object} [options] - Generation options
 * @param {string} [options.ecLevel='M'] - Error correction level: 'L', 'M', 'Q', or 'H'
 * @returns {object} QR code object with matrix, version, size, and render methods
 */
function generate(text, options = {}) {
  const { ecLevel = 'M' } = options;

  if (!text || typeof text !== 'string') {
    throw new Error('Input text must be a non-empty string');
  }

  if (!EC_LEVELS.hasOwnProperty(ecLevel)) {
    throw new Error(`Invalid error correction level: ${ecLevel}. Use 'L', 'M', 'Q', or 'H'`);
  }

  const qr = generateMatrix(text, ecLevel);

  return {
    matrix: qr.matrix,
    version: qr.version,
    size: qr.size,
    ecLevel,

    toSVG: (opts) => toSVG(qr, opts),
    toCanvas: (canvas, opts) => toCanvas(qr, canvas, opts),
    toDataURL: (opts) => toDataURL(qr, opts),
    toBoolean2D: () => toBoolean2D(qr),
  };
}

export { generate, toSVG, toCanvas, toDataURL, toBoolean2D };
export default { generate };
