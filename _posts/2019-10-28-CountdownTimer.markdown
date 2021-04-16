---
layout: post
title: CountdownTimer
date:   2019-10-28
categories: [iOS]
tags: [tool]
---

# CountdownTimer

[CountdownTimer](https://github.com/remember17/CountdownTimer)

全局倒计时工具，可以维护任意多个倒计时
当APP从后台进入前台的时候，倒计时不受影响。

## 使用方法：

#### 一. OC版本 

1.把`CountdownTimer.h`和`CountdownTimer.m`文件拖进项目

2.在`CountdownTimer.h`的枚举`CountDownKey`中添加定时器

> 每个枚举值代表一个可供使用的定时器

```objective-c
// 当需要一个倒计时的时候就在这里加一个key
typedef enum : NSUInteger {
    test1 = 0,
    test2,
} CountdownKey;
```

3.在需要的地方导入头文件

```objective-c
#import "CountdownTimer.h"
```

4.开启一个定时器

```objective-c
[CountdownTimer startTimerWithKey:test1 count:60 callBack:^(NSInteger count, BOOL isFinished) {
    NSLog(@"倒计时：%ld", count);
    NSLog(@"是否结束倒计时：%d", isFinished);
}];
```

5.手动停止某个定时器

> 手动停止或倒计时结束，此定时器都会被移除，除非再次开启

```objective-c
[CountdownTimer stopTimerWithKey:test1];
```

6.继续某个定时器

> - 已经被停止的定时器是无法继续的，因为停止的定时器会被移除
> - 这个方法的作用是当开始定时器的页面被销毁，又想继续获取定时器状态的时候使用

```objective-c
[CountdownTimer continueTimerWithKey:test1 callBack:^(NSInteger count, BOOL isFinished) {
    NSLog(@"倒计时：%ld", count);
    NSLog(@"是否结束倒计时：%d", isFinished);
}];
```

7.判断某个定时器是否结束了

```objective-c
BOOL isFinished = [CountdownTimer isFinishedTimerWithKey:test1];
NSLog(@"倒计时是否已经结束：%d", isFinished);
```

#### 二. Swift版本

1.把`CountdownTimer.swift`文件拖进项目

2.在`CountdownTimer.swift`的枚举`CountDownKey`中添加定时器

> 每个枚举值代表一个可供使用的定时器

```objective-c
enum CountDownKey: CaseIterable {
  case test1
  case test2
  // 当需要一个倒计时的时候就在这里加一个key
}
```

3.开启一个定时器

```objective-c
CountdownTimer.startTimer(key: .test1, count: 60) { (count, finish) in
  print(count) // 倒计时数字
  print(finish) // 是否完成倒计时
}
```

4.手动停止某个定时器

> 手动停止或倒计时结束，此定时器都会被移除，除非再次开启

```objective-c
CountdownTimer.stopTimer(key: .test1)
```

5.继续某个定时器

> - 已经被停止的定时器是无法继续的，因为停止的定时器会被移除
> - 这个方法的作用是当开始定时器的页面被销毁，又想继续获取定时器状态的时候使用

```objective-c
CountdownTimer.continueTimer(key: .test1) { (count, finish) in
  print(count) // 倒计时数字
  print(finish) // 是否完成倒计时
}
```

6.判断某个定时器是否结束了

```objective-c
let isFinished = CountdownTimer.isFinishedTimer(key: .test1)
print(isFinished)
```

[https://github.com/remember17/CountdownTimer](https://github.com/remember17/CountdownTimer)