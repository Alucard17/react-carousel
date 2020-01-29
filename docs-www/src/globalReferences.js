console.log({ env: process.env });
const { default: Carousel, Dots } = (() => {
  console.log('connecting with local react-carousel source code');
  return require('../../src');
})();

import './styles/carousel.scss';
import Icon from 'react-fa';

import imageOne from './static/mona.jpg';
import imageTwo from './static/scream.jpg';
import imageThree from './static/starry-night.jpg';

import thumbnailOne from './static/mona_thumbnail.jpg';
import thumbnailTwo from './static/scream_thumbnail.jpg';
import thumbnailThree from './static/starry-night_thumbnail.jpg';

export { Carousel, Dots, Icon, imageOne, imageTwo, imageThree, thumbnailOne, thumbnailTwo, thumbnailThree };

