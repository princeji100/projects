

export const TMDB_CONFIG = {
    BASE_URL: process.env.EXPO_PUBLIC_TMDB_BASE_URL,
    API_KEY: process.env.EXPO_PUBLIC_TMDB_API_KEY,
    Headers: {
        accept: 'application/json',
        Authorization: `Bearer ${process.env.EXPO_PUBLIC_TMDB_API_KEY}`,
    }
}

export const fetchMovies = async ({ query }: { query: string }) => {
    try {
        if (!TMDB_CONFIG.API_KEY) {
            throw new Error('API key is not configured');
        }

        const endpoint = query 
            ? `${TMDB_CONFIG.BASE_URL}/search/movie?query=${encodeURIComponent(query)}&include_adult=false&language=en-US&page=1` 
            : `${TMDB_CONFIG.BASE_URL}/discover/movie?include_adult=false&include_video=false&language=en-US&page=1&sort_by=popularity.desc`;

        const response = await fetch(endpoint, {
            method: 'GET',
            headers: TMDB_CONFIG.Headers,
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('API Error:', {
                status: response.status,
                statusText: response.statusText,
                body: errorText
            });
            throw new Error(`API Error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        return data.results;
    } catch (error) {
        console.error('Fetch error:', error);
        throw error;
    }
}

export const fetchMovieDetails = async (movieId: string): Promise<MovieDetails> => {
    try{
        const response = await fetch(`${TMDB_CONFIG.BASE_URL}/movie/${movieId}?api_key=${TMDB_CONFIG.API_KEY}`, {
            method: 'GET',
            headers: TMDB_CONFIG.Headers,
        })

        if(!response.ok){
            throw new Error(`API Error: ${response.status} ${response.statusText}`);
        }
        const data = await response.json();
        
        return data;
    }catch(error){
        console.error('Fetch error:', error);
        throw error;
    }
}