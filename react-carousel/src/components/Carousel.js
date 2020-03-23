/* eslint-disable react/no-unused-prop-types  */ // we disable propTypes usage checking as we use getProp function
/* eslint-disable react/jsx-no-bind  */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import has from 'lodash/has';
import PropTypes from 'prop-types';
import classnames from 'classnames';

import config from '../constants/config';
import useEventListener from '../hooks/useEventListener';
import useOnResize from '../hooks/useOnResize';
import simulateEvent from '../tools/simulateEvent';

import CarouselItem from './CarouselItem';

import '../styles/Carousel.scss';

const Carousel = props => {
  const [slideMovement, setSlideMovement] = useState({
    clicked: null,
    dragStart: null,
    dragOffset: 0,
  });

  const [transitionEnabled, setTransitionEnabled] = useState(false);

  const interval = null;

  const trackRef = useRef(null);
  const nodeRef = useRef(null);

  const [carouselWidth, windowWidth] = useOnResize(nodeRef);

  /**
   * Returns the value of a prop based on the current window width and breakpoints provided
   * @param {string} propName name of the prop you want to get
   * @param {object} customProps props object (used e.g. when you want to get prop from prevProps object instead of props)
   * @return {any} props value
   */
  const getProp = (propName, customProps = null) => {
    const usedProps = customProps || props;
    let activeBreakpoint = null;
    if (usedProps.breakpoints) {
      const resolutions = Object.keys(props.breakpoints);
      resolutions.forEach(resolutionString => {
        const resolution = parseInt(resolutionString);
        if (windowWidth <= resolution) {
          if (!activeBreakpoint || activeBreakpoint > resolution) {
            activeBreakpoint = resolution;
          }
        }
      });
    }

    if (activeBreakpoint) {
      if (has(usedProps.breakpoints[activeBreakpoint], propName)) {
        return usedProps.breakpoints[activeBreakpoint][propName];
      }
    }
    return usedProps[propName];
  };

  /**
   * Handler setting transitionEnabled value in state to false after transition animation ends
   */
  const onTransitionEnd = () => {
    setTransitionEnabled(true);
  };

  /**
   * Function handling beginning of mouse drag by setting index of clicked item and coordinates of click in the state
   * @param {event} e event
   * @param {number} index of the element drag started on
   */
  const onMouseDown = useCallback((e, index) => {
    e.preventDefault();
    e.stopPropagation();
    const { pageX } = e;

    setSlideMovement({
      clicked: index,
      dragStart: pageX,
    });
  });

  /**
   * Function handling mouse move if drag has started. Sets dragOffset in the state.
   * @param {event} e event
   */
  const onMouseMove = useCallback(e => {
    const { pageX } = e;
    if (slideMovement.dragStart !== null) {
      setSlideMovement(previousState => ({
        ...slideMovement,
        dragOffset: pageX - previousState.dragStart,
      }));
    }
  });

  useEffect(() => {
    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, []);

  useEffect(() => {
    setTransitionEnabled(true);
  }, [props.value]);

  const getChildren = () => {
    if (!props.children) {
      if (props.slides) {
        return props.slides;
      }
      return [];
    }
    if (Array.isArray(props.children)) {
      return props.children;
    }
    return [props.children];
  };

  /**
   * Clamps number between 0 and last slide index.
   * @param {number} value to be clamped
   * @return {number} new value
   */
  const clamp = value => {
    const maxValue = getChildren().length - 1;
    if (value > maxValue) {
      return maxValue;
    }
    if (value < 0) {
      return 0;
    }
    return value;
  };

  const getCurrentValue = () => clamp(props.value);

  /**
   * Returns the current slide index (from either props or internal state)
   * @return {number} index
   */
  const getCurrentSlideIndex = () => clamp(getCurrentValue());

  const getActiveSlideIndex = () => getCurrentSlideIndex();

  /**
   * Function handling beginning of touch drag by setting index of touched item and coordinates of touch in the state
   * @param {event} e event
   * @param {number} index of the element drag started on
   */
  const onTouchStart = (e, index) => {
    const { changedTouches } = e;
    setSlideMovement({
      clicked: index,
      dragStart: changedTouches[0].pageX,
    });
  };

  /**
   * Clamps a provided value and triggers onChange
   * @param {number} value desired index to change current value to
   * @return {undefined}
   */
  const changeSlide = value => props.onChange(clamp(value));

  /**
   * Calculates width of a single slide in a carousel
   * @return {number} width of a slide in px
   */
  const getCarouselElementWidth = () => props.itemWidth || carouselWidth;

  /**
   * Checks what slide index is the nearest to the current position (to calculate the result of dragging the slider)
   * @return {number} index
   */
  const getNearestSlideIndex = () => {
    const slideIndexOffset = -Math.round(slideMovement.dragOffset / getCarouselElementWidth());

    return getCurrentValue() + slideIndexOffset;
  };

  /**
   * Function handling end of touch or mouse drag. If drag was long it changes current slide to the nearest one,
   * if drag was short (or it was just a click) it changes slide to the clicked (or touched) one.
   * It resets clicked index, dragOffset and dragStart values in state.
   * @param {event} e event
   */
  const onMouseUpTouchEnd = useCallback(e => {
    if (slideMovement.dragStart !== null) {
      e.preventDefault();
      if (getProp('draggable')) {
        if (Math.abs(slideMovement.dragOffset) > config.clickDragThreshold) {
          changeSlide(getNearestSlideIndex());
        }
      }
      setSlideMovement({
        clicked: null,
        dragOffset: 0,
        dragStart: null,
      });
      setTransitionEnabled(true);
    }
  });


  /**
   * Calculates offset in pixels to be applied to Track element in order to show current slide correctly
   * @return {number} offset in px
   */
  const getTransformOffset = () => {
    const elementWidthWithOffset = getCarouselElementWidth() + getProp('offset');
    const dragOffset = getProp('draggable') ? slideMovement.dragOffset : 0;
    const currentValue = getActiveSlideIndex();

    return dragOffset - currentValue * elementWidthWithOffset;
  };

  useEventListener('mouseup', onMouseUpTouchEnd);

  useEventListener('mousemove', onMouseMove, nodeRef.current);
  useEventListener('touchstart', simulateEvent, nodeRef.current);
  useEventListener('touchmove', simulateEvent, nodeRef.current);
  useEventListener('touchend', simulateEvent, nodeRef.current);

  useEventListener('transitionend', onTransitionEnd, trackRef.current);


  /* ========== rendering ========== */
  const renderCarouselItems = () => {
    const transformOffset = getTransformOffset();
    const children = getChildren();

    const trackLengthMultiplier = 1;
    const trackWidth = carouselWidth * children.length * trackLengthMultiplier;
    const animationSpeed = getProp('animationSpeed');
    const draggable = getProp('draggable') && children && children.length > 1;

    const trackStyles = {
      width: `${trackWidth}px`,
      transitionDuration: transitionEnabled ? `${animationSpeed}ms, ${animationSpeed}ms` : null,
    };

    trackStyles.transform = `translateX(${transformOffset}px)`;

    const slides = children;

    return (
      <div className="BrainhubCarousel__trackContainer">
        <ul
          className={classnames(
            'BrainhubCarousel__track',
            {
              'BrainhubCarousel__track--transition': transitionEnabled,
              'BrainhubCarousel__track--draggable': draggable,
            },
          )}
          style={trackStyles}
          ref={trackRef}
        >
          {slides.map((carouselItem, index) => (
            // eslint-disable-next-line no-undefined
            [null, undefined].includes(carouselItem) ? null : (
              <CarouselItem
                key={index}
                currentSlideIndex={getActiveSlideIndex()}
                index={index}
                width={getCarouselElementWidth()}
                offset={index !== slides.length ? props.offset : 0}
                onMouseDown={onMouseDown}
                onTouchStart={onTouchStart}
                isDragging={!!Math.abs(slideMovement.dragOffset)}
              >
                {carouselItem}
              </CarouselItem>
            )
          ))}
        </ul>
      </div>
    );
  };

  return (
    <div>
      <div
        className={classnames('BrainhubCarousel', getProp('className'))}
        ref={nodeRef}
      >
        {renderCarouselItems()}
      </div>
    </div>
  );
};

Carousel.propTypes = {
  value: PropTypes.number,
  onChange: PropTypes.func,
  children: PropTypes.node,
  slides: PropTypes.arrayOf(PropTypes.node),
  itemWidth: PropTypes.number,
  offset: PropTypes.number,
  draggable: PropTypes.bool,
  animationSpeed: PropTypes.number,
  className: PropTypes.string,
  breakpoints: PropTypes.objectOf(PropTypes.shape({
    draggable: PropTypes.bool,
    animationSpeed: PropTypes.number,
    dots: PropTypes.bool,
    className: PropTypes.string,
  })),
};
Carousel.defaultProps = {
  offset: 0,
  animationSpeed: 500,
  draggable: true,
};

export default Carousel;