import { View, Text, ScrollView, Image, TouchableOpacity, ActivityIndicator } from 'react-native'
import React from 'react'
import { router, useLocalSearchParams } from 'expo-router'
import useFetch from '@/services/useFetch';
import { fetchMovieDetails } from '@/services/api';
import { icons } from '@/constants/icons';

interface MovieInfoProps{
    label:string;
    value?:string | number| null ;
}

const MovieInfo = ({label,value}:MovieInfoProps) =>(
  <View className='flex-col items-start justify-center mt-4'>
      <Text className='text-light-200 font-normal text-xs'>
          {label}
      </Text>
      <Text className='text-light-100 font-bold text-sm mt-1'>
          {value || 'N/A'}
      </Text>
  </View> 
)

const MovieDetailes = () => {
  const { id } = useLocalSearchParams();
  const { data: movie, loading } = useFetch(() => fetchMovieDetails(id as string));

  if (loading) {
    return (
      <View className="flex-1 bg-primary items-center justify-center">
        <ActivityIndicator size="large" color="#0EA5E9" />
        <Text className="text-light-200 mt-2">Loading movie details...</Text>
      </View>
    );
  }

  return (
    <View className='bg-primary flex-1'>
      <ScrollView contentContainerStyle={{ paddingBottom: 80 }}>
        <View className="relative">
          <Image
            className='w-full h-[420px] rounded-b-3xl shadow-lg'
            resizeMode='cover'
            source={{ uri: `https://image.tmdb.org/t/p/w500/${movie?.poster_path}` }}
          />
          <View className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-primary/90 to-transparent rounded-b-3xl" />
        </View>
        <View className='flex-col items-start justify-center mt-6 px-5 bg-white/5 rounded-2xl shadow-lg mx-2 pb-6'>
          <Text className='text-white font-bold text-2xl mt-4'>{movie?.title}</Text>
          <View className='flex-row items-center gap-x-2 mt-2'>
            <Text className='text-light-200 text-base'>
              {movie?.release_date?.split('-')[0]}
            </Text>
            <Text className='text-light-200 text-base'>
              {movie?.runtime}m
            </Text>
          </View>
          <View className='flex-row items-center bg-cyan-900/80 px-3 py-1 rounded-md gap-x-2 mt-3 shadow'>
            <Image source={icons.star} className='size-5' />
            <Text className='text-base text-cyan-300 font-bold'>{((movie?.vote_average ?? 0)/2).toFixed(1)}/5</Text>
            <Text className='text-sm text-light-200'>({movie?.vote_count} votes)</Text>
          </View>
          <MovieInfo label='Overview' value={movie?.overview} />
          <MovieInfo label='Genres' value={movie?.genres?.map((genre) => genre.name).join(' , ') || 'N/A'} />
          <View className='flex flex-row justify-between w-full gap-x-4'>
            <MovieInfo label='Budget' value={`${movie?.budget ? '$'+(movie?.budget / 1000000).toFixed(2) + ' Million' : 'N/A'}`} />
            <MovieInfo label='Revenue' value={`${movie?.revenue ? '$'+(movie?.revenue / 1000000).toFixed(2) + ' Million' : 'N/A'}`} />
          </View>
          <MovieInfo label='Production Companies' value={movie?.production_companies?.map((company) => company.name).join(' , ') || 'N/A'} />
        </View>
      </ScrollView>
      <TouchableOpacity
        onPress={() => {
          // Add a small delay before navigation to prevent white flash
          requestAnimationFrame(() => {
            router.back();
          });
        }}
        className='absolute bottom-5 left-0 right-0 mx-5 bg-accent rounded-xl py-4 flex flex-row items-center justify-center z-50 shadow-lg'
        activeOpacity={0.85}
      >
        <Image source={icons.arrow} className='size-5 mr-2 rotate-180' tintColor={'#fff'} />
        <Text className='text-white font-semibold text-base'>Go Back</Text>
      </TouchableOpacity>
    </View>
  )
}

export default MovieDetailes