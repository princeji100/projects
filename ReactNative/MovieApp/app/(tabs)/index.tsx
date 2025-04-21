import SearchBar from "@/components/SearchBar";
import { icons } from "@/constants/icons";
import { images } from "@/constants/images";
import { ActivityIndicator, FlatList, Image, Text, View } from "react-native";
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from "expo-router";
import { fetchMovies } from "@/services/api";
import useFetch from "@/services/useFetch";
import MovieCard from "@/components/MovieCard";
import { getTrendingMovies } from "@/services/appWrite";
import TrendingCards from "@/components/TrendingCards";
import { StyleSheet } from "react-native";

export default function Index() {
  const router = useRouter();
  const {
    data: trendingMovies,
    loading: trendingMoviesLoading,
    error: trendingMoviesError,
  } = useFetch(getTrendingMovies);
  const { data: movies, loading: moviesLoading, error: moviesError } = useFetch(() => fetchMovies({
    query: '',
  }));

  return (
    <View className="flex-1 bg-primary relative">
      <Image source={images.bg} className="absolute w-full h-full z-0 opacity-70" blurRadius={2} />
      <LinearGradient
        colors={['rgba(24,24,47,0.8)', 'rgba(24,24,47,0.95)']}
        style={{ ...StyleSheet.absoluteFillObject, zIndex: 1 }}
      />
      
      <View className="flex-1 px-5 z-10">
        <View className="items-center mt-16 mb-5">
          <View className="bg-white/10 rounded-2xl p-3 shadow-lg">
            <Image source={icons.logo} className="w-12 h-10" />
          </View>
        </View>

        {moviesLoading || trendingMoviesLoading ? (
          <ActivityIndicator
            size={"large"}
            color={"#5eead4"}
            className="mt-10 self-center"
          />
        ) : moviesError || trendingMoviesError ? (
          <View className="flex-1 justify-center items-center">
            <Text className="text-white text-center mt-10 text-lg font-bold">
              Unable to load movies
            </Text>
            <Text className="text-white text-center mt-2 text-sm px-4 opacity-80">
              {moviesError?.message || trendingMoviesError?.message}
            </Text>
            <Text className="text-white text-center mt-2 text-xs opacity-50">
              Error: {moviesError?.name}
            </Text>
          </View>
        ) : (
          <FlatList
            data={movies}
            ListHeaderComponent={() => (
              <>
                <SearchBar 
                  onPress={() => router.push('/search')} 
                  placeholder='Search for movies' 
                  className="mb-4" 
                />
                
                {trendingMovies && (
                  <>
                    <View className="mt-6 flex-row items-center">
                      <Text className="text-lg text-cyan-300 font-bold mb-3 mr-2">
                        🔥 Trending Movies
                      </Text>
                      <View className="flex-1 h-0.5 bg-cyan-800/40 rounded-full" />
                    </View>
                    
                    <FlatList
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      ItemSeparatorComponent={() => <View className="w-fit" />}
                      data={trendingMovies}
                      renderItem={({ item, index }) => (
                        <TrendingCards movie={item} index={index} />
                      )}
                      keyExtractor={(item) => item.movie_id.toString()}
                      contentContainerStyle={{ paddingVertical: 16 }}
                    />
                    
                    <View className="mt-4 flex-row items-center">
                      <Text className="text-white text-lg font-bold mr-2">
                        🆕 Latest Movies
                      </Text>
                      <View className="flex-1 h-0.5 bg-white/20 rounded-full" />
                    </View>
                  </>
                )}
              </>
            )}
            renderItem={({ item }) => <MovieCard {...item} />}
            keyExtractor={(item) => item.id.toString()}
            numColumns={3}
            columnWrapperStyle={{
              justifyContent: 'space-between',
              gap: 12,
              marginBottom: 12,
            }}
            contentContainerStyle={{
              paddingBottom: 80
            }}
            initialNumToRender={6}
            maxToRenderPerBatch={3}
            windowSize={5}
            removeClippedSubviews={true}
          />
        )}
      </View>
    </View>
  );
}
