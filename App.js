import React, {Component} from 'react';
import {
  Platform,
  Button,
  StyleSheet,
  Text,
  View,
  ScrollView,
  TextInput,
  TouchableOpacity,
  PermissionsAndroid,
} from 'react-native';
import BackgroundTimer from "react-native-background-timer";
import SmsAndroid from 'react-native-get-sms-android';
import io from 'socket.io-client';
import axios from 'axios';

export default class App extends Component {
  constructor() {
    super();
    this.state = {
      chatMessage: '',
      phoneNumber: '',
      smsList: [],
      chatMessages: [],
      _interval: null,
      second: 0,
      status: ''
    };
  }

  async componentDidMount() {
    if (Platform.OS === 'android') {
      try {
        if (!(await this.checkPermissions())) {
          await this.requestPermissions();
        }

        if (await this.checkPermissions()) {
          // this.listSMS();
        }

        this.socket = io('https://node-read-sms.herokuapp.com');
        this.socket.on("get sms", msg => {
          this.setState({chatMessages: [...this.state.chatMessages, msg]});
        })
      } catch (e) {
        console.error(e);
      }
    }
  }

  async checkPermissions() {
    let hasPermissions = false;
    try {
      hasPermissions = await PermissionsAndroid.check(
        PermissionsAndroid.PERMISSIONS.READ_SMS,
      );
      if (!hasPermissions) return false;
      hasPermissions = await PermissionsAndroid.check(
        PermissionsAndroid.PERMISSIONS.SEND_SMS,
      );
      if (!hasPermissions) return false;
    } catch (e) {
      console.error(e);
    }
    return hasPermissions;
  }

  async requestPermissions() {
    let granted = {};
    try {
      granted = await PermissionsAndroid.requestMultiple(
        [
          PermissionsAndroid.PERMISSIONS.READ_SMS,
          PermissionsAndroid.PERMISSIONS.SEND_SMS,
        ],
        {
          title: 'Example App SMS Features',
          message: 'Example SMS App needs access to demonstrate SMS features',
          buttonNeutral: 'Ask Me Later',
          buttonNegative: 'Cancel',
          buttonPositive: 'OK',
        },
      );
      if (granted === PermissionsAndroid.RESULTS.GRANTED) {
        console.log('You can use SMS features');
      } else {
        console.log('SMS permission denied');
      }
    } catch (err) {
      console.warn(err);
    }
  }

  onStart = () => {
    // BackgroundTimer.runBackgroundTimer(() => {
    //   this.listSMS();
    // }, 1000);
    this._interval = BackgroundTimer.setInterval(() => {
      this.setState({
        // second: this.state.second + 1,
        status: 'Start'
      });
      this.listSMS();
    }, 200);
  }

  onStop = () => {
    this.setState({
      // second: 0,
      status: 'Stop'
    });
    BackgroundTimer.clearInterval(this._interval);
  }

  renderStartButton = () => {
      return (
        <Button
          title="Start"
          onPress={this.onStart}
        />
      )
  }

  renderStopButton = () => {
      return (
        <Button
          title="Stop"
          onPress={this.onStop}
          />
        )
  }

  listSMS = () => {
    const {phoneNumber} = this.state;
    var filter = {
      box: 'inbox',
      address: phoneNumber
    };

    SmsAndroid.list(
      JSON.stringify(filter),
      (fail) => {
        console.log('Failed with this error: ' + fail);
      },
      (count, smsList) => {
        var arr = JSON.parse(smsList);
        if(arr.length !== 0) {
          if(this.state.smsList.length === 0){
            this.setState({smsList: arr});
            this.socket.emit("get sms", arr);
          }
          else {
            if(this.state.smsList[0].address !== phoneNumber){
              this.setState({smsList: arr});
              this.socket.emit("get sms", arr);
            }
            else{
              if(this.state.smsList.length !== arr.length) {
                this.setState({smsList: arr});
                this.socket.emit("get sms", arr);
              }
            }
          }
        }
      },
    );
  };

  getPayload() {
    console.log("Get payload")
    axios.get('https://node-read-sms.herokuapp.com/api/movies').then(res => {
      console.log(res)
    }).catch(error => {
      // console.log(error)
      console.log(error)
    })
  }

  renderShowSMS() {
    return this.state.smsList.map((sms) => {
      return (
        <View style={{borderColor: '#bbb', borderWidth: 1}} key={sms._id}>
          <Text>From: {sms.address}</Text>
          <Text>Body: {sms.body}</Text>
          <Text>Id: {sms._id}</Text>
          <View style={{flexDirection: 'row', alignItems: 'center'}}>
            <Text>Date timestamp: {sms.date}</Text>
          </View>
          <Text>Date (readable): {new Date(sms.date).toString()}</Text>
        </View>
      );
    });
  }

  renderLatestMessages = () => {
    return (
      <View style={{flex: 2, alignItems: 'flex-start'}}>
        <View style={{flexDirection: 'row', alignItems: 'center'}}>
          <Text>Phone number : </Text>
          <TextInput
            style={{ height: 40, width: 200, borderWidth: 2, marginLeft: 10 }}
            autoCorrect={false}
            value={this.state.phoneNumber}
            onChangeText={phoneNumber => {
              this.setState({ phoneNumber });
            }}
          />
        </View>
        <View>
          <Text style={{marginTop: 15}}>
            Status : {this.state.status}
          </Text>
        </View>
        <View style={{flexDirection: 'row', alignItems: 'center', marginTop: 20}}>
          {/* <Button title="Read SMS" onPress={this.listSMS} /> */}
          {/* <Button title="Get Payload" onPress={this.getPayload} /> */}
          
          <View style={styles.buttonWrapper}>
              {this.renderStartButton()}
              {this.renderStopButton()}
          </View>
        </View>
        <ScrollView>{this.renderShowSMS()}</ScrollView>
      </View>
    );
  };

  render() {
  const chatMessages = this.state.chatMessages.map(chatMessage => <Text key={chatMessage}>{chatMessage}</Text>)
    // The default 'react-native init' output is used if not android platform
    if (Platform.OS !== 'android') {
      return (
        <View style={styles.container}>
          <Text style={styles.welcome}>Welcome to React Native!</Text>
          <Text style={styles.instructions}>To get started, edit App.js</Text>
          <Text style={styles.instructions}>{instructions}</Text>
        </View>
      );
    }

    return (
      <View style={styles.container}>
        {this.renderLatestMessages()}
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    margin: 20,
    flex: 1,
    justifyContent: 'center',
    alignItems: 'flex-start',
    backgroundColor: '#F5FCFF',
  },
  buttonWrapper: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
});
