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
Page({

  /**
   * 页面的初始数据
   */
  data: {
    choicedType: "普通模式",
    ShowModal_newRecord: false,
    temTitle: "未命名录音",
    temExplain: null,
    tabContent: [],
    show1: true,
    audioMsg: {},
    //存储计时器
    setInter: '',
    num: 0,
    min: 0,
    tempFilePath: null,
    UsersRecords: [],
    temRecordid: null,
    temcouldID: null,
  },
  choicingType: function() {
    var thispage = this;
    wx.showActionSheet({
      itemList: thispage.data.tabContent,
      success: function(res) {
        if (!res.cancel) {
          thispage.setData({
            choicedType: thispage.data.tabContent[res.tapIndex]
          })
        }
      }
    });
  },

  getinput_title: function(e) {
    //console.log(e)
    this.setData({
      temTitle: e.detail.value
    })
  },
  getinput_explain: function(e) {
    //console.log(e)
    this.setData({
      temExplain: e.detail.value
    })
  },

  confirm_newRecord: function() {

    this.setData({
      ShowModal_newRecord: false
    })
    this.uploadFile();
  },
  closeModal_newRecord: function() {
    var that=this;
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


  showModal3: function(string) {
    var that = this
    wx.showModal({
      title: '提示',
      content: string,
      success(res) {
        if (res.confirm) {
          console.log('用户点击确定')
          that.showModal_newRecord()
        } else if (res.cancel) {
          console.log('用户点击取消')
        }
      }
    })
  },
  getmin: function(sec) {
    var that = this;
    var xx = parseInt(sec / 60);
    that.setData({
      min: xx
    })
  },
  showok: function(a) {
    wx.showToast({
      title: a,
      icon: 'none',
      // icon: 'success',
      duration: 2500
    })
  },
  showend: function() {
    wx.showToast({
      title: '播放结束',
      icon: 'success',
      duration: 2000
    })
  },
  /**
   * 生命周期函数--监听页面加载
   */
  onLoad: function(options) {
    var that = this
    var thispage = this;

    //获得标签数据
    db.collection("TabContent").get().then(function(res) {
      var p = new Promise(function(resolve, reject) {
        var tem;
        console.log("获取TabContent记录成功_time", res);

        //没有记录，新建
        if (res.data.length == 0) {
          console.log("没有已建立的获取TabContent记录,开始新建.")
          db.collection("TabContent").add({
            data: {
              type: ["所有", "普通模式", "计时模式"]
            },
            success: function(result) {
              console.log("次要记录新建成功", result)

              db.collection("TabContent").get({

                success: function(ress) {
                  console.log(ress)
                  thispage.setData({
                    tabContent: ress.data[0].type
                  })
                }
              })
            },
            fail: console.error
          })
        } else {
          thispage.setData({
            tabContent: res.data[0].type
          })
        }
        resolve();
      })
      return p;
    })

    //监听录音开始，并启动计时器
    recorderManager.onStart(() => {
      that.startSetInter()
    })

    //监听录音结束 并返回本地MP3文件
    recorderManager.onStop((res) => {
      var that = this;
      that.endSetInter();
      this.setData({
        show1: true,
        audioMsg: res,
        tempFilePath: res.tempFilePath
      })
      console.log(this.data.audioMsg)
      if (res.duration < 3000)
        that.showModal3("录音少于三秒\r\n是否继续上传至云")
      else {
        that.showModal_newRecord();
      }
    })

  },
  showModal_newRecord: function() {
    this.setData({
      ShowModal_newRecord: true
    })
  },
  downDatabase: function() {
    var thispage = this;
    db.collection("UsersRecords").get({
      success: function(res) {
        console.log("申请数据", res)
        thispage.setData({
          UsersRecords: res.data
        })
      }
    })
  },
  uploadFile: function() {
    let thispage = this;
    //taptabContent
    db.collection("TabContent").get({
      success: function(res) {
        console.log("获取TabContent记录成功", res)
        //没有记录，新建
        if (res.data.length == 0) {
          console.log("没有已建立的获取TabContent记录,开始新建")
          db.collection("TabContent").add({
            data: {
              type: "所有"
            },
            success: function(res) {
              console.log("次要记录新建成功", res)
            }
          })

        }
      },
      fail: function(res) {
        console.log("Get TabContent fail", res)
      }
    })

    //先创建一条数据库记录
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
      success: function(res) {

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
          success: function(res) {
            console.log("上传成功", res);
            thispage.setData({
              temcouldID: res.fileID
            });

            //然后再修改对应记录的couldID
            db.collection("UsersRecords").doc(thispage.data.temRecordid).update({
              data: {
                cloudID: thispage.data.temcouldID
              },
              success: function(res) {
                console.log("成功修改了couldid", res);
                wx.showToast({
                  title: '上传成功',
                  icon: 'success',
                  duration: 2000

                })
                //重新拉取数据
                thispage.downDatabase();
              },
              fail: function() {
                console.log("修改couldid失败！")
              },
              complete: function() {
                thispage.setData({
                  temTitle: "未命名录音"
                })
              }
            })
          }
        })
      }
    })
  },
  /**
   * 生命周期函数--监听页面初次渲染完成
   */
  onReady: function() {},

  /**
   * 生命周期函数--监听页面显示
   */
  onShow: function() {},

  /**
   * 生命周期函数--监听页面隐藏
   */
  onHide: function() {},

  /**
   * 生命周期函数--监听页面卸载
   */
  onUnload: function() {
    var that = this;
    //清除计时器  即清除setInter
    clearInterval(that.data.setInter)
    innerAudioContext.destroy();
  },

  /**
   * 页面相关事件处理函数--监听用户下拉动作
   */
  onPullDownRefresh: function() {},

  /**
   * 页面上拉触底事件的处理函数
   */
  onReachBottom: function() {},

  /**
   * 用户点击右上角分享
   */
  onShareAppMessage: function() {},
  //开始录音
  startRecording() {
    recorderManager.start(options)
    var that = this;
    that.setData({
      show1: false
    })
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
  //播放录音
  playrecord: function() {
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
  startSetInter: function() {
    var that = this;
    //将计时器赋值给setInter
    that.data.setInter = setInterval(
      function() {
        var numVal = that.data.num + 1;
        that.getmin(numVal);
        that.setData({
          num: numVal
        });
      }, 1000);
  },
  endSetInter: function() {
    var that = this;
    //清除计时器  即清除setInter
    clearInterval(that.data.setInter)
    that.setData({
      num: 0,
      min: 0
    })
  },
})