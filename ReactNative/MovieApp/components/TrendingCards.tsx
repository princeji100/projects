import { Pressable, View, Text, Image } from 'react-native';
import MaskedView from '@react-native-masked-view/masked-view';
import { router } from 'expo-router';
import { images } from '@/constants/images';

const TrendingCards = ({ movie, index }) => {
  const { movie_id, title, poster_url } = movie;

  return (
    <Pressable
      onPress={() => {
        requestAnimationFrame(() => {
          router.push(`/movies/${movie_id}`);
        });
      }}
      className="rounded-xl w-32 h-fit mr-5 overflow-hidden"
      android_ripple={{ color: 'rgba(255,255,255,0.1)' }}
    >
      <View className="bg-white/5 rounded-xl shadow-lg pb-2">
        <Image
          source={{
            uri: poster_url
              ? `https://image.tmdb.org/t/p/w500/${poster_url}`
              : 'https://placehold.co/600x400/1a1a1a/ffffff.png',
          }}
          className="w-32  h-48 rounded-lg"
          resizeMode="cover"
        />
        <View className="absolute bottom-9 -left-1 px-2 py-1 rounded-full">
          <MaskedView
            maskElement={
              <Text className="text-white text-6xl font-bold drop-shadow-lg">
                {index + 1}
              </Text>
            }
          >
            <Image
              source={images.rankingGradient}
              className="size-14"
              resizeMode="contain"
            />
          </MaskedView>
        </View>
      </View>
      <Text
        className="text-sm font-bold mt-2 text-light-200"
        numberOfLines={2}
      >
        {title}
      </Text>
    </Pressable>
  );
};

export default TrendingCards;