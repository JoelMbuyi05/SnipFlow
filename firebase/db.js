// ============================================
// DATABASE LAYER - FIRESTORE REST API
// ============================================

console.log('📦 Database module loading...');

const FIREBASE_API_KEY = "AIzaSyBgxvD7XNhIX_yHg2vVPa9tzfMC6zwCN_g";
const FIREBASE_PROJECT = "snipflow-951ed";
const DB_URL = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT}/databases/(default)/documents/snippets`;

// ============================================
// CREATE - Add new snippet
// ============================================
async function createSnippet(userId, snippetData) {
  try {
    const token = localStorage.getItem('snipflow_token');
    if (!token) throw new Error('Not authenticated');

    console.log('💾 Creating snippet for user:', userId);

    const response = await fetch(`${DB_URL}?key=${FIREBASE_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        fields: {
          userId: { stringValue: userId },
          title: { stringValue: snippetData.title?.trim() || '' },
          code: { stringValue: snippetData.code?.trim() || '' },
          language: { stringValue: snippetData.language || 'javascript' },
          tags: {
            arrayValue: {
              values: (snippetData.tags || '')
                .split(',')
                .map(t => t.trim())
                .filter(t => t)
                .map(t => ({ stringValue: t }))
            }
          },
          description: { stringValue: snippetData.description?.trim() || '' },
          isFavorite: { booleanValue: false },
          createdAt: { timestampValue: new Date().toISOString() },
          updatedAt: { timestampValue: new Date().toISOString() }
        }
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'Failed to create snippet');
    }

    const data = await response.json();
    const docId = data.name.split('/').pop();
    
    console.log('✅ Snippet created:', docId);
    return docId;

  } catch (error) {
    console.error('❌ Create error:', error.message);
    throw error;
  }
}

// ============================================
// READ - Get all user's snippets
// ============================================
async function getAllSnippets(userId) {
  try {
    const token = localStorage.getItem('snipflow_token');
    if (!token) {
      console.log('❌ Not authenticated');
      return [];
    }

    console.log('📥 Loading snippets for user:', userId);

    const response = await fetch(`${DB_URL}?key=${FIREBASE_API_KEY}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      console.error('Failed to fetch snippets');
      return [];
    }

    const data = await response.json();
    const snippets = [];

    if (data.documents) {
      data.documents.forEach(doc => {
        const fields = doc.fields;
        
        // Filter by userId
        if (fields.userId?.stringValue !== userId) return;

        snippets.push({
          id: doc.name.split('/').pop(),
          title: fields.title?.stringValue || '',
          code: fields.code?.stringValue || '',
          language: fields.language?.stringValue || 'javascript',
          tags: fields.tags?.arrayValue?.values?.map(v => v.stringValue) || [],
          description: fields.description?.stringValue || '',
          isFavorite: fields.isFavorite?.booleanValue || false,
          createdAt: new Date(fields.createdAt?.timestampValue || new Date()),
          updatedAt: new Date(fields.updatedAt?.timestampValue || new Date())
        });
      });
    }

    // Sort by created date (newest first)
    snippets.sort((a, b) => b.createdAt - a.createdAt);

    console.log('✅ Loaded', snippets.length, 'snippets');
    return snippets;

  } catch (error) {
    console.error('❌ Read error:', error);
    return [];
  }
}

// ============================================
// UPDATE - Edit snippet
// ============================================
async function updateSnippet(snippetId, updates) {
  try {
    const token = localStorage.getItem('snipflow_token');
    if (!token) throw new Error('Not authenticated');

    console.log('✏️ Updating snippet:', snippetId);

    const fields = {};

    if (updates.title) fields.title = { stringValue: updates.title };
    if (updates.code) fields.code = { stringValue: updates.code };
    if (updates.language) fields.language = { stringValue: updates.language };
    if (updates.tags) {
      fields.tags = {
        arrayValue: {
          values: (typeof updates.tags === 'string' 
            ? updates.tags.split(',')
            : updates.tags
          ).map(t => ({ stringValue: t.trim() }))
        }
      };
    }
    if (updates.isFavorite !== undefined) fields.isFavorite = { booleanValue: updates.isFavorite };
    
    fields.updatedAt = { timestampValue: new Date().toISOString() };

    const response = await fetch(`${DB_URL}/${snippetId}?key=${FIREBASE_API_KEY}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ fields })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'Failed to update');
    }

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
async function deleteSnippet(snippetId) {
  try {
    const token = localStorage.getItem('snipflow_token');
    if (!token) throw new Error('Not authenticated');

    console.log('🗑️ Deleting snippet:', snippetId);

    const response = await fetch(`${DB_URL}/${snippetId}?key=${FIREBASE_API_KEY}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      throw new Error('Failed to delete');
    }

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
async function toggleFavorite(snippetId, currentState) {
  try {
    const token = localStorage.getItem('snipflow_token');
    if (!token) throw new Error('Not authenticated');

    const newState = !currentState;

    const response = await fetch(`${DB_URL}/${snippetId}?key=${FIREBASE_API_KEY}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        fields: {
          isFavorite: { booleanValue: newState },
          updatedAt: { timestampValue: new Date().toISOString() }
        }
      })
    });

    if (!response.ok) {
      throw new Error('Failed to toggle favorite');
    }

    console.log('✅ Favorite toggled:', snippetId);
    return newState;

  } catch (error) {
    console.error('❌ Toggle error:', error);
    throw error;
  }
}

// ============================================
// SEARCH (Client-side filtering)
// ============================================
function searchSnippets(snippets, searchTerm) {
  if (!searchTerm || searchTerm.trim().length === 0) return snippets;
  
  const term = searchTerm.toLowerCase();
  return snippets.filter(s => {
    const titleMatch = (s.title || '').toLowerCase().includes(term);
    const codeMatch = (s.code || '').toLowerCase().includes(term);
    const tagsMatch = Array.isArray(s.tags) && s.tags.some(t => t.toLowerCase().includes(term));
    
    return titleMatch || codeMatch || tagsMatch;
  });
}

// ============================================
// FILTER BY TYPE
// ============================================
function filterByType(snippets, filterType) {
  if (!Array.isArray(snippets)) return [];
  
  if (filterType === 'favorites') {
    return snippets.filter(s => s.isFavorite === true);
  } else if (filterType === 'recent') {
    return snippets.slice(0, 10);
  }
  return snippets;
}

// ============================================
// MAKE FUNCTIONS AVAILABLE GLOBALLY
// ============================================
window.createSnippet = createSnippet;
window.getAllSnippets = getAllSnippets;
window.updateSnippet = updateSnippet;
window.deleteSnippet = deleteSnippet;
window.toggleFavorite = toggleFavorite;
window.searchSnippets = searchSnippets;
window.filterByType = filterByType;

console.log('✅ Database module loaded');