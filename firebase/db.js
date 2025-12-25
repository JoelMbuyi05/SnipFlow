// ============================================
// FIREBASE/DB.JS - DATABASE LAYER
// ============================================
// Handles ALL database operations
// UI code should NOT be here
// This can be reused in other projects

import { 
  collection, 
  addDoc, 
  getDocs, 
  getDoc,
  doc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where,
  orderBy,
  Timestamp 
} from 'https://www.gstatic.com/firebasejs/10.5.0/firebase-firestore.js';

// Get database reference
function getDb() {
  return window.firebase?.db;
}

// ============================================
// CREATE - Add new snippet
// ============================================
export async function createSnippet(userId, snippetData) {
  try {
    const db = getDb();
    if (!db) throw new Error('Database not initialized');

    const snippetsRef = collection(db, 'snippets');
    
    const docRef = await addDoc(snippetsRef, {
      userId,
      title: snippetData.title.trim(),
      code: snippetData.code.trim(),
      language: snippetData.language,
      tags: snippetData.tags
        .split(',')
        .map(t => t.trim().toLowerCase())
        .filter(t => t.length > 0),
      description: snippetData.description || '',
      isFavorite: false,
      views: 0,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });

    console.log('✅ Snippet created:', docRef.id);
    return docRef.id;

  } catch (error) {
    console.error('❌ Create error:', error);
    throw error;
  }
}

// ============================================
// READ - Get all user's snippets
// ============================================
export async function getAllSnippets(userId) {
  try {
    const db = getDb();
    if (!db) throw new Error('Database not initialized');

    const snippetsRef = collection(db, 'snippets');
    const q = query(
      snippetsRef,
      where('userId', '==', userId),
      orderBy('createdAt', 'desc')
    );

    const querySnapshot = await getDocs(q);
    const snippets = [];

    querySnapshot.forEach(doc => {
      snippets.push({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date(),
        updatedAt: doc.data().updatedAt?.toDate() || new Date(),
      });
    });

    console.log('✅ Loaded', snippets.length, 'snippets');
    return snippets;

  } catch (error) {
    console.error('❌ Read error:', error);
    throw error;
  }
}

// ============================================
// READ - Get single snippet
// ============================================
export async function getSnippet(snippetId) {
  try {
    const db = getDb();
    if (!db) throw new Error('Database not initialized');

    const snippetRef = doc(db, 'snippets', snippetId);
    const docSnap = await getDoc(snippetRef);

    if (!docSnap.exists()) {
      throw new Error('Snippet not found');
    }

    return {
      id: docSnap.id,
      ...docSnap.data(),
      createdAt: docSnap.data().createdAt?.toDate() || new Date(),
      updatedAt: docSnap.data().updatedAt?.toDate() || new Date(),
    };

  } catch (error) {
    console.error('❌ Get error:', error);
    throw error;
  }
}

// ============================================
// UPDATE - Edit snippet
// ============================================
export async function updateSnippet(snippetId, updates) {
  try {
    const db = getDb();
    if (!db) throw new Error('Database not initialized');

    const snippetRef = doc(db, 'snippets', snippetId);
    
    // If updating tags, parse them
    if (updates.tags && typeof updates.tags === 'string') {
      updates.tags = updates.tags
        .split(',')
        .map(t => t.trim().toLowerCase())
        .filter(t => t.length > 0);
    }

    await updateDoc(snippetRef, {
      ...updates,
      updatedAt: Timestamp.now(),
    });

    console.log('✅ Snippet updated:', snippetId);
    return snippetId;

  } catch (error) {
    console.error('❌ Update error:', error);
    throw error;
  }
}

// ============================================
// DELETE - Remove snippet
// ============================================
export async function deleteSnippet(snippetId) {
  try {
    const db = getDb();
    if (!db) throw new Error('Database not initialized');

    const snippetRef = doc(db, 'snippets', snippetId);
    await deleteDoc(snippetRef);

    console.log('✅ Snippet deleted:', snippetId);
    return true;

  } catch (error) {
    console.error('❌ Delete error:', error);
    throw error;
  }
}

// ============================================
// TOGGLE FAVORITE
// ============================================
export async function toggleFavorite(snippetId, currentState) {
  try {
    const db = getDb();
    if (!db) throw new Error('Database not initialized');

    const snippetRef = doc(db, 'snippets', snippetId);
    const newState = !currentState;

    await updateDoc(snippetRef, {
      isFavorite: newState,
      updatedAt: Timestamp.now(),
    });

    console.log('✅ Favorite toggled:', snippetId);
    return newState;

  } catch (error) {
    console.error('❌ Toggle favorite error:', error);
    throw error;
  }
}

// ============================================
// SEARCH (Client-side filtering)
// ============================================
export function searchSnippets(snippets, searchTerm) {
  if (!searchTerm) return snippets;
  
  const term = searchTerm.toLowerCase();
  return snippets.filter(s =>
    s.title.toLowerCase().includes(term) ||
    s.code.toLowerCase().includes(term) ||
    s.tags?.some(t => t.includes(term))
  );
}

// ============================================
// FILTER BY TYPE
// ============================================
export function filterByType(snippets, filterType) {
  if (filterType === 'favorites') {
    return snippets.filter(s => s.isFavorite);
  } else if (filterType === 'recent') {
    return snippets.slice(0, 10);
  }
  return snippets; // 'all'
}

console.log('✅ Database module loaded');