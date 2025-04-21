import { icons } from '@/constants/icons'
import { router } from 'expo-router'
import { View, Text, Pressable, Image } from 'react-native'

const MovieCard = ({id,poster_path,title, vote_average, release_date}:Movie) => {
  
  return (
    <Pressable 
      onPress={() => {
        requestAnimationFrame(() => {
          router.push(`/movies/${id}`);
        });
      }}
      className="flex-1 max-w-[30%]"
      android_ripple={{ color: 'rgba(255,255,255,0.1)' }}
    >
      <Image source={{uri:poster_path 
          ?`https://image.tmdb.org/t/p/w500/${poster_path}`: 'https://placehold.co/600x400/1a1a1a/ffffff.png'}} className='w-full h-52 rounded-lg' resizeMode='cover'/>
          <Text className='text-white text-sm font-bold mt-2' numberOfLines={1}>{title}</Text>
          <View className='flex-row items-center justify-start gap-x-1'>
            <Image source={icons.star} className='size-4' />
            <Text className='text-xs text-white font-bold uppercase'>{(vote_average/2).toFixed(1)}</Text>
          </View>
          <View className='flex-row items-center justify-between'>
        <Text className='text-xs text-light-300 font-medium mt-1'>
          {release_date?.split('-')[0]}
        </Text>
          </View>
    </Pressable>
  )
}

export default MovieCard