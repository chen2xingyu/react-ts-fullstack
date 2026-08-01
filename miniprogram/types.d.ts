/// <reference types="@tarojs/taro" />

declare module '*.png';
declare module '*.gif';
declare module '*.jpg';
declare module '*.jpeg';
declare module '*.svg';
declare module '*.scss';
declare module '*.css';

declare namespace JSX {
  interface IntrinsicElements {
    [elem: string]: any
  }
}
