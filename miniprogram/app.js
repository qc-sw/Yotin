//app.js
const defaultTime = {
  defaultWorkTime: 25,
  defaultRestTime: 5
}

App({
  onLaunch: function() {
    let workTime = wx.getStorageSync('workTime')
    let restTime = wx.getStorageSync('restTime')
    if (!workTime) {
      wx.setStorage({
        key: 'workTime',
        data: defaultTime.defaultWorkTime
      })
    }
    if (!restTime) {
      wx.setStorage({
        key: 'restTime',
        data: defaultTime.defaultRestTime
      })
    }
    if (!wx.cloud) {
      console.error('请使用 2.2.3 或以上的基础库以使用云能力')
    } else {
      wx.cloud.init({
        traceUser: true,
      })
    };
    // 调用云函数
    wx.cloud.callFunction({
      name: 'login',
      data: {},
      success: res => {
        this.globalData.openid = res.result.openid
        console.log('[云函数] [login] user openid: ', this.globalData.openid)
      },
      fail: err => {
        console.error('[云函数] [login] 调用失败', err)
      }
    });

    this.globalData = {
      openid: null
    }
  },
  
  
  globalData: {
    openid:null,
    voiceIndex: 0

  }
})