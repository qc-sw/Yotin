var app = getApp();
var recorderManager = wx.getRecorderManager(); //录音管理

var options = {
  duration: 600000,
  sampleRate: 16000,
  numberOfChannels: 1,
  encodeBitRate: 48000,
  format: 'mp3',//这里是生成的音频文件格式
  frameSize: 50,
};
Page({

  data: {
    audioMsg: {}
  },
  onLoad() {
    var that = this
    //监听录音结束 并返回本地MP3文件
    recorderManager.onStop((res) => {
      that.setData({
        audioMsg: res
      })
      console.log(res)
    })
  },
  //开始录音
  startRecording() {
    recorderManager.start(options)
    console.log('开始')
  },
  //暂停录音
  pauseRecording() {
    recorderManager.pause();
    console.log('暂停')
  },
  //继续录音
  resumeRecording() {
    recorderManager.resume();
  },
  //结束录音
  stopRecording() {
    recorderManager.stop();
  }
})
