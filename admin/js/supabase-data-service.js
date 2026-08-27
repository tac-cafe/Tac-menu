const DataService = {
    cache: {
        banners: [],
        categories: [],
        recommended: [],
        products: []
    },
    async loadCollection(collection) {
        if (collection === 'products') {
            if (!this.cache.categories || this.cache.categories.length === 0) {
                const { data } = await supabaseClient.from('categories').select('*').order('order', { ascending: true });
                if (data) this.cache.categories = data;
            }
        }
        const { data, error } = await supabaseClient.from(collection).select('*').order('order', { ascending: true });
        if (data) {
            this.cache[collection] = data;
        } else {
            this.cache[collection] = [];
        }
    },
    getData(collection) {
        return this.cache[collection] || [];
    },
    async uploadImage(base64Image) {
        if (!base64Image || !base64Image.startsWith('data:image')) return base64Image;
        
        try {
            // Convert base64 to blob
            const res = await fetch(base64Image);
            const blob = await res.blob();
            
            // Create unique filename
            const ext = blob.type.split('/')[1] || 'jpg';
            const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`;
            
            const { data, error } = await supabaseClient
                .storage
                .from('images')
                .upload(fileName, blob, {
                    contentType: blob.type,
                    cacheControl: '3600',
                    upsert: false
                });
                
            if (error) {
                console.error('Error uploading image:', error);
                throw error;
            }
            
            const { data: publicUrlData } = supabaseClient
                .storage
                .from('images')
                .getPublicUrl(fileName);
                
            return publicUrlData.publicUrl;
        } catch (e) {
            console.error('Image upload failed:', e);
            throw e;
        }
    },
    async addItem(collection, item) {
        delete item.id;
        const { data, error } = await supabaseClient.from(collection).insert(item).select().single();
        if (data) {
            this.cache[collection].push(data);
            return data;
        } else {
            console.error('Error adding item', error);
            throw error;
        }
    },
    async updateItem(collection, id, updatedFields) {
        const { data, error } = await supabaseClient.from(collection).update(updatedFields).eq('id', id).select().single();
        if (data) {
            const index = this.cache[collection].findIndex(i => i.id === id);
            if (index > -1) {
                this.cache[collection][index] = data;
            }
        } else {
            console.error('Error updating item', error);
            throw error;
        }
    },
    async deleteImage(publicUrl) {
        if (!publicUrl || !publicUrl.includes('/storage/v1/object/public/images/')) return;
        
        try {
            // Extract the filename from the public URL
            const fileName = publicUrl.split('/').pop();
            const { error } = await supabaseClient.storage.from('images').remove([fileName]);
            
            if (error) {
                console.error('Error deleting image:', error);
            }
        } catch (e) {
            console.error('Image delete failed:', e);
        }
    },
    async deleteItem(collection, id) {
        const { error } = await supabaseClient.from(collection).delete().eq('id', id);
        if (!error) {
            this.cache[collection] = this.cache[collection].filter(i => i.id !== id);
        } else {
            console.error('Error deleting item', error);
            throw error;
        }
    }
};

