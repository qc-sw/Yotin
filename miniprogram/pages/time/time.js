const app = getApp();
const db = wx.cloud.database();
var recorderManager = wx.getRecorderManager(); //录音管理
const innerAudioContext = wx.createInnerAudioContext()
innerAudioContext.onPlay(() => {
  console.log("录音播放\n" + "innerAudioContext.src:", innerAudioContext.src)
})
//监听录音播放结束
innerAudioContext.onEnded(() => {
  wx.showToast({
    title: '播放结束',
    icon: 'success',
    duration: 2000
  })
  console.log("录音结束")
})
innerAudioContext.onError((res) => {
  console.log(res.errMsg)
  console.log(res.errCode)
})
var options = {
  duration: 600000,
  sampleRate: 16000,
  numberOfChannels: 1,
  encodeBitRate: 48000,
  format: 'mp3', //这里是生成的音频文件格式
  frameSize: 50,
};
const util = require('../../utils/util.js')
const actionName = {
  stop: '停止',
  start: '开始'
}

const initDeg = {
  left: 45,
  right: -45,
}

Page({


  data: {
    hidden:true,
    choicedType: "计时模式",
    ShowModal_newRecord: false,
    temTitle: "未命名录音",
    temExplain: null,
    tabContent:[],
    audioMsg:{},
    remainTimeText: '',
    timerType: 'work',
    log: {},
    completed: false,
    isRuning: false,
    leftDeg: initDeg.left,
    rightDeg: initDeg.right,
    showDialog:false,
    tempFilePath: null,
    UsersRecords: [],
    temRecordid: null,
    temcouldID: null
  },
  showok: function (a) {
    wx.showToast({
      title: a,
      icon: 'success',
      // icon: '',
      duration: 2500
    })
  },
  toggleDialog:function() {
    if(!this.data.isRuning){
      var that = this;
      this.setData({ hidden: false })
    }
  },
  confirm:function(){
      this.setData({hidden:true})
  },
  cancle: function () {
    this.setData({ hidden:true })
  },
  onLoad:function(){
    var thispage = this;
    //获得标签数据
    db.collection("TabContent").get().then(function (res) {
      var p = new Promise(function (resolve, reject) {
        var tem;
        console.log("获取TabContent记录成功_time", res);

        //没有记录，新建
        if (res.data.length == 0) {
          console.log("没有已建立的获取TabContent记录,开始新建.")
          db.collection("TabContent").add({
            data: {
              type: ["所有", "普通模式", "计时模式"]
            },
            success: function (result) {
              console.log("次要记录新建成功", result)

              db.collection("TabContent").get({

                success:function(ress){
                  console.log(ress)
                  thispage.setData({
                    tabContent: ress.data[0].type
                  })
                }
              })
            },
            fail: console.error
          })
        }
        else {
          thispage.setData({
            tabContent: res.data[0].type
          })
        }
        resolve();
      })
      return p;
    })

    wx.setNavigationBarColor({
      frontColor: '#ffffff',
      backgroundColor: '#3197ed',
    })
    var that = this
    //监听录音开始，启动计时器
    recorderManager.onStart(()=>{
      console.log("启动计时器")
      this.timer = setInterval((function () {
        this.updateTimer()
        this.startNameAnimation()
      }).bind(this), 1000)
    })
    //监听录音结束 并返回本地MP3文件
    recorderManager.onStop((res) => {
      var that = this;
      that.stopTimer()
      this.setData({
        show1: true,
        audioMsg: res,
        tempFilePath: res.tempFilePath
      })
      console.log(this.data.audioMsg)
      // if (res.duration < 3000)
      //   that.showModal("录音少于三秒\r\n是否继续上传至云")
      // else {
      //   that.uploadFile()
      //   that.showok("录音成功\r\n已上传至云文件")
      // }
    })
  },
  showModal_newRecord: function () {
    this.setData({
      ShowModal_newRecord: true
    })
  },
  downDatabase: function () {
    var thispage = this;
    db.collection("UsersRecords").get({
      success: function (res) {
        console.log("申请数据", res)
        thispage.setData({
          UsersRecords: res.data
        })
      }
    })
  },
  uploadFile: function () {
    var thispage=this;
    db.collection("UsersRecords").add({
      data: {
        name: thispage.data.temTitle,
        cloudID: null,
        CreatTime: db.serverDate(),
        type: thispage.data.choicedType,
        isPlay: false,
        isTap: false,
        isTouchMove: false,
        isHide: false,
        explainText: thispage.data.temExplain
      },
      success: function (res) {

        console.log("记录创建成功", res)

        //获得记录的_id
        thispage.setData({
          temRecordid: res._id
        })

        //console.log("thispage.data.temRecordid:", thispage.data.temRecordid)

        //上传文件（根据_id给它命名）
        wx.cloud.uploadFile({
          cloudPath: app.globalData.openid + '/' + thispage.data.temRecordid + thispage.data.tempFilePath.match(/\.[^.]+?$/)[0],
          filePath: thispage.data.tempFilePath,
          success: function (res) {
            console.log("上传成功", res);
            thispage.setData({
              temcouldID: res.fileID
            });

            //然后再修改对应记录的couldID
            db.collection("UsersRecords").doc(thispage.data.temRecordid).update({
              data: {
                cloudID: thispage.data.temcouldID
              },
              success: function (res) {
                console.log("成功修改了couldid", res);
                wx.showToast({
                  title: '上传成功',
                  icon: 'success',
                  duration: 2000

                })
                //重新拉取数据
                thispage.downDatabase();
              },
              fail: function () {
                console.log("修改couldid失败！")
              },
              complete:function(){
                thispage.setData({
                  temTitle:"未命名录音"
                })
              }
            })
          }
        })
      }
    })
  },
  getinput_title: function (e) {
    //console.log(e)
    this.setData({
      temTitle: e.detail.value
    })
  },
  getinput_explain: function (e) {
    //console.log(e)
    this.setData({
      temExplain: e.detail.value
    })
  },
  choicingType: function () {
    var thispage = this;
    wx.showActionSheet({
      itemList: thispage.data.tabContent,
      success: function (res) {
        if (!res.cancel) {
          thispage.setData({
            choicedType: thispage.data.tabContent[res.tapIndex]
          })
        }
      }
    });
  },
  confirm_newRecord: function () {

    this.setData({
      ShowModal_newRecord: false
    })
    this.uploadFile();
  },
  closeModal_newRecord: function () {
    var that = this;
    wx.showModal({
      title: '不保存录音？',
      success(res) {
        if (res.confirm) {
          //关闭新录音的信息输入弹窗
          that.setData({
            ShowModal_newRecord: false
          })
        }
      }
    })
  },

  onShow: function() {
    if (this.data.isRuning) return
    let workTime = util.formatTime(wx.getStorageSync('workTime'), 'HH')
    // let restTime = util.formatTime(wx.getStorageSync('restTime'), 'HH')
    this.setData({
      workTime: workTime,
      // restTime: restTime,
      remainTimeText: workTime + ':00'
    })
  },
  onUnloadL:function(){
    var that = this;
    //清除计时器  即清除setInter
    clearInterval(that.data.setInter)
    innerAudioContext.destroy();
  },

  changeWorkTime: function (e) {
    wx.setStorage({
      key: 'workTime',
      data: e.detail.value
    })
      this.onShow()
  },
  changingWorkTime: function(e){
    let a = util.formatTime(e.detail.value,'HH')
    this.setData({
      remainTimeText:a + ':00'
    })
  },
  startTimer: function(e) {
    let startTime = Date.now()
    let isRuning = this.data.isRuning
    let timerType = e.target.dataset.type
    let showTime = this.data[timerType + 'Time']
    let keepTime = showTime * 60 * 1000
    if (!isRuning) {
      this.startRecording();
      
    } else {
      this.stopTimer()
      this.stopRecording()
      // this.showok()
      this.showModal_newRecord();

    }
    this.setData({
      isRuning: !isRuning,
      completed: false,
      timerType: timerType,
      remainTimeText: showTime + ':00',
    })

    this.data.log = {
      startTime: Date.now(),
      keepTime: keepTime,
      endTime: keepTime + startTime,
      action: actionName[isRuning ? 'stop' : 'start'],
      type: timerType
    }

    this.saveLog(this.data.log)
  },

  startNameAnimation: function() {
    let animation = wx.createAnimation({
      duration: 450
    })
    animation.opacity(0.2).step()
    animation.opacity(1).step()
    this.setData({
      nameAnimation: animation.export()
    })
  },

  stopTimer: function() {
    // reset circle progress
    this.setData({
      leftDeg: initDeg.left,
      rightDeg: initDeg.right
    })

    // clear timer
    this.timer && clearInterval(this.timer)
  },

  updateTimer: function() {
    let log = this.data.log
    let now = Date.now()
    let remainingTime = Math.round((log.endTime - now) / 1000)
    let H = util.formatTime(Math.floor(remainingTime / (60 * 60)) % 24, 'HH')
    let M = util.formatTime(Math.floor(remainingTime / (60)) % 60, 'MM')
    let S = util.formatTime(Math.floor(remainingTime) % 60, 'SS')
    let halfTime

    // update text
    if (remainingTime > 0) {
      let remainTimeText = (H === "00" ? "" : (H + ":")) + M + ":" + S
      this.setData({
        remainTimeText: remainTimeText
      })
    } else if (remainingTime == 0) {
      this.setData({
        completed: true
      })
      this.stopTimer()
      this.stopRecording()
      return
    }

    // update circle progress
    halfTime = log.keepTime / 2
    if ((remainingTime * 1000) > halfTime) {
      this.setData({
        leftDeg: initDeg.left - (180 * (now - log.startTime) / halfTime)
      })
    } else {
      this.setData({
        leftDeg: -135,
        rightDeg: initDeg.right - (180 * (now - (log.startTime + halfTime)) / halfTime)
      })
    }
  },
  saveLog: function(log) {
    var logs = wx.getStorageSync('logs') || []
    logs.unshift(log)
    wx.setStorageSync('logs', logs)
  },
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
    var that = this;
    recorderManager.stop();
  },
  showModal: function (string) {
    var that = this
    wx.showModal({
      title: '提示',
      content: string,
      success(res) {
        if (res.confirm) {
          console.log('用户点击确定')
          that.uploadFile()
        } else if (res.cancel) {
          console.log('用户点击取消')
        }
      }
    })
  },
  showok: function () {
    wx.showToast({
      title: '录音成功',
      icon: 'success',
      duration: 2000
    })
  },
  //播放录音
  playrecord: function () {
    if (JSON.stringify(this.data.audioMsg) == '{}') {
      wx.showModal({
        title: '提示',
        content: '请开始录音',
        showCancel: false,
        success(res) {
          if (res.confirm) {
            console.log('用户点击确定')
          }
        }
      })
    } else {
      innerAudioContext.src = this.data.audioMsg.tempFilePath;
      innerAudioContext.play();
    }
  },
})
