import MovieCard from '@/components/MovieCard'
import { images } from '@/constants/images'
import { View, Text, Image, FlatList, ActivityIndicator, StyleSheet } from 'react-native'
import useFetch from '@/services/useFetch';
import { fetchMovies } from '@/services/api';
import { icons } from '@/constants/icons';
import SearchBar from '@/components/SearchBar';
import { useEffect, useState } from 'react';
import { updateSearchCount } from '@/services/appWrite';
import { LinearGradient } from 'expo-linear-gradient';

const search = () => {
  const [searchQuery, setSearchQuery] = useState('')
  const { data: movies, loading: moviesLoading, error: moviesError, refetch: loadMovies, reset } = useFetch(() => fetchMovies({
    query: searchQuery,
  }), false);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchQuery.trim()) {
        loadMovies();
      } else {
        reset();
      }
    }, 500);
    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  useEffect(() => {
    if (
      searchQuery.trim() &&
      Array.isArray(movies) &&
      movies.length > 0 &&
      movies[0]
    ) {
      updateSearchCount(searchQuery, movies[0]);
    }
  }, [movies]);

  return (
    <View className='flex-1 bg-primary relative'>
      <Image source={images.bg} className='flex-1 absolute w-full h-full z-0 opacity-70' resizeMode='cover' />
      <LinearGradient
        colors={['rgba(24,24,47,0.8)', 'rgba(24,24,47,0.95)']}
        style={{ ...StyleSheet.absoluteFillObject, zIndex: 1 }}
      />
      <FlatList
        data={movies}
        renderItem={({ item }) => <MovieCard {...item} />}
        keyExtractor={(item) => item.id.toString()}
        className='px-5 z-10'
        numColumns={3}
        columnWrapperStyle={{
          justifyContent: 'center',
          gap: 16,
          marginVertical: 16
        }}
        contentContainerStyle={{
          paddingBottom: 100
        }}
        ListHeaderComponent={
          <>
            <View className='w-full flex-row justify-center mt-20 items-center'>
              <View className="bg-white/10 rounded-2xl p-3 shadow-lg">
                <Image source={icons.logo} className='w-12 h-10' />
              </View>
            </View>
            <View className='my-5'>
              <SearchBar
                placeholder='Search movies...'
                value={searchQuery}
                onChangeText={(text: string) => setSearchQuery(text)}
                className="rounded-xl bg-white/10 text-white px-4 py-2"
              />
            </View>
            {moviesLoading && (
              <ActivityIndicator size={'large'} color={'#5eead4'} className='my-3 self-center' />
            )}
            {moviesError && (
              <Text className='text-red-500 px-5 my-3'>Error : {moviesError.message}</Text>
            )}
            {!moviesLoading && !moviesError && searchQuery.trim() && movies?.length > 0 && (
              <Text className='text-xl text-white font-bold mb-2'>
                Search Result for{' '}
                <Text className='text-cyan-300'>{searchQuery}</Text>
              </Text>
            )}
          </>
        }
        ListEmptyComponent={
          !moviesLoading && !moviesError ? (
            <View className='flex-1 justify-center items-center mt-10'>
              <Text className='text-white text-lg font-bold mt-3 text-center'>
                {searchQuery.trim() ? 'No movie found' : 'What are You Watching Today?'}
              </Text>
            </View>
          ) : null
        }
      />
    </View>
  )
}

export default search