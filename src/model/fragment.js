// src/model/fragment.js
const { randomUUID } = require('crypto');
const contentType = require('content-type');

const {
  readFragment,
  writeFragment,
  readFragmentData,
  writeFragmentData,
  listFragments,
  deleteFragment,
} = require('./data');

class Fragment {
  constructor({ id, ownerId, created, updated, type, size = 0 }) {
    if (!ownerId) {
      throw new Error('ownerId is required');
    }

    if (!type) {
      throw new Error('type is required');
    }

    if (!Fragment.isSupportedType(type)) {
      throw new Error(`type ${type} is not supported`);
    }

    if (typeof size !== 'number') {
      throw new Error('size must be a number');
    }

    if (size < 0) {
      throw new Error('size cannot be negative');
    }

    this.id = id || randomUUID();
    this.ownerId = ownerId;
    this.created = created || new Date().toISOString();
    this.updated = updated || new Date().toISOString();
    this.type = type;
    this.size = size;
  }

  /**
   * Get all fragments (id or full) for the given user
   * @param {string} ownerId user's hashed email
   * @param {boolean} expand whether to expand ids to full fragments
   * @returns Promise<Array<Fragment>>
   */
  static async byUser(ownerId, expand = false) {
    if (!ownerId) {
      throw new Error('ownerId is required');
    }

    const results = await listFragments(ownerId, expand);

    if (expand) {
      return results.map((fragmentData) => new Fragment(fragmentData));
    }

    return results;
  }

  /**
   * Gets a fragment for the user by the given id.
   * @param {string} ownerId user's hashed email
   * @param {string} id fragment's id
   * @returns Promise<Fragment>
   */
  static async byId(ownerId, id) {
    if (!ownerId || !id) {
      throw new Error('ownerId and id are required');
    }

    const fragmentData = await readFragment(ownerId, id);

    if (!fragmentData) {
      throw new Error('fragment not found');
    }

    return new Fragment(fragmentData);
  }

  /**
   * Delete the user's fragment data and metadata for the given id
   * @param {string} ownerId user's hashed email
   * @param {string} id fragment's id
   * @returns Promise<void>
   */
  static async delete(ownerId, id) {
    if (!ownerId || !id) {
      throw new Error('ownerId and id are required');
    }

    return deleteFragment(ownerId, id);
  }

  /**
   * Saves the current fragment (metadata) to the database
   * @returns Promise<void>
   */
  save() {
    this.updated = new Date().toISOString();
    return writeFragment(this);
  }

  /**
   * Gets the fragment's data from the database
   * @returns Promise<Buffer>
   */
  getData() {
    return readFragmentData(this.ownerId, this.id);
  }

  /**
   * Set's the fragment's data in the database
   * @param {Buffer} data
   * @returns Promise<void>
   */
  async setData(data) {
    if (!Buffer.isBuffer(data)) {
      throw new Error('data must be a Buffer');
    }

    this.size = data.length;
    this.updated = new Date().toISOString();

    await Promise.all([writeFragment(this), writeFragmentData(this.ownerId, this.id, data)]);
  }

  /**
   * Returns the mime type (e.g., without encoding) for the fragment's type:
   * "text/html; charset=utf-8" -> "text/html"
   * @returns {string} fragment's mime type (without encoding)
   */
  get mimeType() {
    const { type } = contentType.parse(this.type);
    return type;
  }

  /**
   * Returns true if this fragment is a text/* mime type
   * @returns {boolean} true if fragment's type is text/*
   */
  get isText() {
    return this.mimeType.startsWith('text/');
  }

  /**
   * Returns the formats into which this fragment type can be converted
   * @returns {Array<string>} list of supported mime types
   */
  get formats() {
    const baseType = this.mimeType;
    const formats = [baseType];

    // Text-based conversions
    if (this.isText) {
      formats.push('text/plain', 'text/markdown', 'text/html');

      // CSV can convert to JSON
      if (baseType === 'text/csv') {
        formats.push('application/json');
      }

      // Markdown can convert to plain text
      if (baseType === 'text/markdown') {
        formats.push('text/plain');
      }
    }

    // JSON conversions
    if (baseType === 'application/json') {
      formats.push('text/plain', 'application/yaml');
    }

    // YAML conversions
    if (baseType === 'application/yaml') {
      formats.push('text/plain', 'application/json');
    }

    // Image conversions
    if (baseType.startsWith('image/')) {
      formats.push('image/png', 'image/jpeg', 'image/webp', 'image/gif', 'image/avif');
    }

    return [...new Set(formats)];
  }

  /**
   * Returns true if we know how to work with this content type
   * @param {string} value a Content-Type value (e.g., 'text/plain' or 'text/plain: charset=utf-8')
   * @returns {boolean} true if we support this Content-Type (i.e., type/subtype)
   */
  static isSupportedType(value) {
    if (!value || typeof value !== 'string') {
      return false;
    }

    try {
      const { type } = contentType.parse(value);
      const supportedTypes = [
        'text/plain',
        'text/markdown',
        'text/html',
        'text/csv',
        'application/json',
        'application/yaml',
        'image/png',
        'image/jpeg',
        'image/webp',
        'image/gif',
        'image/avif',
      ];

      return supportedTypes.includes(type);
    } catch {
      return false;
    }
  }
}

module.exports.Fragment = Fragment;
