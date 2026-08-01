export default defineAppConfig({
  pages: [
    'pages/index/index',
    'pages/interview/interview',
    'pages/user/user',
  ],
  window: {
    backgroundTextStyle: 'light',
    navigationBarBackgroundColor: '#3b82f6',
    navigationBarTitleText: '前端面试题库',
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
        pagePath: 'pages/interview/interview',
        text: '面试',
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
