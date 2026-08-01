export default defineAppConfig({
  pages: [
    'pages/index/index',
    'pages/tech/tech',
    'pages/user/user',
  ],
  window: {
    backgroundTextStyle: 'light',
    navigationBarBackgroundColor: '#3b82f6',
    navigationBarTitleText: 'React+TS 工程',
    navigationBarTextStyle: 'white',
    backgroundColor: '#f5f5f5',
  },
  tabBar: {
    color: '#999999',
    selectedColor: '#3b82f6',
    backgroundColor: '#ffffff',
    borderStyle: 'black',
    list: [
      {
        pagePath: 'pages/index/index',
        text: '首页',
        iconPath: 'assets/tabbar/home.png',
        selectedIconPath: 'assets/tabbar/home-active.png',
      },
      {
        pagePath: 'pages/tech/tech',
        text: '技术难点',
        iconPath: 'assets/tabbar/book.png',
        selectedIconPath: 'assets/tabbar/book-active.png',
      },
      {
        pagePath: 'pages/user/user',
        text: '我的',
        iconPath: 'assets/tabbar/user.png',
        selectedIconPath: 'assets/tabbar/user-active.png',
      },
    ],
  },
  style: 'v2',
  sitemapLocation: 'sitemap.json',
})
