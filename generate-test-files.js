#!/usr/bin/env node

/**
 * Test file generator for large file uploads
 * Creates test files of various sizes to test upload functionality
 */

const fs = require('fs');
const path = require('path');

function createTestFile(sizeInMB, filename) {
  console.log(`Creating test file: ${filename} (${sizeInMB}MB)`);
  
  const sizeInBytes = sizeInMB * 1024 * 1024;
  const chunkSize = 1024 * 1024; // 1MB chunks
  const chunks = Math.ceil(sizeInBytes / chunkSize);
  
  const testDir = path.join(__dirname, 'test-files');
  if (!fs.existsSync(testDir)) {
    fs.mkdirSync(testDir, { recursive: true });
  }
  
  const filePath = path.join(testDir, filename);
  const writeStream = fs.createWriteStream(filePath);
  
  const buffer = Buffer.alloc(chunkSize, 'A'); // Fill with 'A' characters
  
  for (let i = 0; i < chunks; i++) {
    const isLastChunk = i === chunks - 1;
    const currentChunkSize = isLastChunk ? sizeInBytes % chunkSize || chunkSize : chunkSize;
    
    if (isLastChunk && currentChunkSize !== chunkSize) {
      const lastBuffer = Buffer.alloc(currentChunkSize, 'A');
      writeStream.write(lastBuffer);
    } else {
      writeStream.write(buffer);
    }
  }
  
  writeStream.end();
  
  writeStream.on('finish', () => {
    console.log(`✅ Created: ${filePath} (${sizeInMB}MB)`);
  });
  
  writeStream.on('error', (error) => {
    console.error(`❌ Error creating ${filename}:`, error);
  });
}

// Create test files of various sizes
const testFiles = [
  { size: 1, name: 'test-1mb.txt' },
  { size: 10, name: 'test-10mb.txt' },
  { size: 50, name: 'test-50mb.txt' },
  { size: 100, name: 'test-100mb.txt' },
  { size: 500, name: 'test-500mb.txt' },
  { size: 1000, name: 'test-1gb.txt' } // 1GB file
];

console.log('🚀 Generating test files for upload testing...\n');

testFiles.forEach(({ size, name }) => {
  createTestFile(size, name);
});

console.log('\n📁 Test files will be created in: ./test-files/');
console.log('⚠️  Note: The 1GB file may take a few minutes to generate.');
console.log('💡 Use these files to test large file upload functionality.\n');
