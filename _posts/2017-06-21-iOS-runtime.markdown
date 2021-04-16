---
layout: post
title: iOS runtime
date:   2017-06-21
categories: [iOS]
tags: [tech]
---

# iOS runtime

[WHRuntimeDemo](https://github.com/remember17/WHRuntimeDemo) 

> 1. 什么是runtime
>
> 2. 什么是isa指针
>
> 3. 什么是SEL，什么是IMP， 什么是Method
>
> 4. 什么是消息机制
>
> 5. runtime运行时的使用场景

# 概述

> **runtime：**Objective-C是动态语言，它将很多静态语言在编译和链接时做的事放到了运行时，这个运行时系统就是runtime。runtime其实就是一个库，它基本上是用C和汇编写的一套API，这个库使C语言有了面向对象的能力。
>
> **静态语言：**在编译的时候会决定调用哪个函数。
>
> **动态语言（OC）：**在运行的时候根据函数的名称找到对应的函数来调用。

> **isa：**OC中，类和类的实例在本质上没有区别，都是对象，任何对象都有isa指针，它指向类或元类（元类后面会讲解）。

> **SEL：**SEL（选择器）是方法的selector的指针。方法的selector表示运行时方法的名字。OC在编译时，会依据每一个方法的名字、参数，生成一个唯一的整型标识(Int类型的地址)，这个标识就是SEL。

> **IMP：**IMP是一个函数指针，指向方法最终实现的首地址。SEL就是为了查找方法的最终实现IMP。

> **Method：**用于表示类定义中的方法，它的结构体中包含一个SEL和IMP，相当于在SEL和IMP之间作了一个映射。

> **消息机制：**任何方法的调用本质就是发送一个消息。编译器会将消息表达式[receiver message]转化为一个消息函数objc_msgSend(receiver, selector)。

> **Runtime的使用：**获取属性列表，获取成员变量列表，获得方法列表，获取协议列表，方法交换（黑魔法），动态的添加方法，调用私有方法，为分类添加属性。

##  

## 一、什么是runtime

概述中已经说了，runtime其实就是一个库，这个库主要做了两件事情：

> 1. 封装：runtime把对象用C语言的结构体来表示，方法用C语言的函数来表示。这些结构体和函数被runtime封装后，我们就可以在程序运行的时候，对类/对象/方法进行操作。
>
> 2. 寻找方法的最终执行：当执行[receiver message]的时候，相当于向receiver发送一条消息message。runtime会根据reveiver能否处理这条message，从而做出不同的反应。

在OC中，类是用Class来表示的，而Class实际上是一个指向objc_class结构体的指针。

![](../assets/iosruntime/runtime-1.png)

看一下objc_class的定义

![](../assets/iosruntime/runtime-2.png)

**在这里只说一下cache**

Cache用于缓存最近使用的方法。一个类只有一部分方法是常用的，每次调用一个方法之后，这个方法就被缓存到cache中，下次调用时runtime会先在cache中查找，如果cache中没有，才会去methodList中查找。有了cache，经常用到的方法的调用效率就提高了！

> 你只要记住，**runtime**其实就是一个库，它是一套API，这个库使C语言有了面向对象的能力。我们可以运用runtime这个库里面的各种方法，在程序运行的时候对类/实例对象/变量/属性/方法等进行各种操作。

## 二、什么是isa指针

在Objective-C中，所有的类自身也是一个对象，我们可以向这个对象发送消息（调用类方法）。先来看一下runtime中实例对象的结构体objc_object。

![](../assets/iosruntime/runtime-3.png)

从结构体中可以看到，这个结构体只包含一个指向其类的isa指针。

> **isa指针的作用：**当我们向一个对象发送消息时，runtime会根据这个对象的isa指针找到这个对象所属的类，在这个类的方法列表及父类的方法列表中，寻找与消息对应的selector指向的方法，找到后就运行这个方法。

要彻底理解isa，还需要了解一下元类的概念。下面我们用类方法创建了一个字典。

![](../assets/iosruntime/runtime-4.png)

这句代码把+dictionary消息发送给NSDictionary类，而这个NSDictionary也是一个对象，既然是对象，那么它也会有一个isa指针，类的isa指针指向什么呢？

为了调用+dictionary方法，这个类的isa指针必须指向一个包含这些类方法的objc_class结构体，这就引出了元类的概念。meta-class（元类）存储着一个类的所有类方法。

> 向一个对象发送消息时，runtime会在这个对象所属的类的方法列表中查找方法；
>
> 向一个类发送消息时，会在这个类的meta-class（元类）的方法列表中查找。

meta-class是一个类，也可以向它发送消息，那么它的isa又是指向什么呢？为了不让这种结构无限延伸下去，Objective-C的设计者让所有的meta-class的isa指向基类（NSObject）的meta-class，而基类的meta-class的isa指针是指向自己（NSObject）。

下图中的虚线箭头表示的是isa指针，实线箭头表示的是父类。

可以看出，所有实例对象的isa都指向它所属的类，而类的isa是指向它的元类，所有元类的isa指向基类的meta-class，基类的meta-class的isa指向自己。需要注意的是，root-class（基类）的superclass是nil。

![](../assets/iosruntime/runtime-5.png)


## 三、什么是SEL，IMP，Method

### SEL

SEL又叫选择器，是方法的selector的指针。

![](../assets/iosruntime/runtime-6.png)

方法的selector用于表示运行时方法的名字。Objective-C在编译时，会依据每一个方法的名字、参数序列，生成一个唯一的整型标识(Int类型的地址)，这个标识就是SEL。

两个类之间，无论它们是父子关系，还是没有关系，只要方法名相同，那么方法的SEL就是一样的，每一个方法都对应着一个SEL，所以在 Objective-C同一个类中，不能存在2个同名的方法，即使参数类型不同也不行。像下面这种情况就会报错。

![](../assets/iosruntime/runtime-7.png)

> SEL是一个指向方法的指针，是根据方法名hash化了的一个字符串，而对于字符串的比较仅仅需要比较他们的地址就可以了，所以速度上非常优秀，它的存在只是为了加快方法的查询速度。

不同的类可以拥有相同的selector，不同类的实例对象执行相同的selector时，会在各自的方法列表中去根据selector寻找对应的IMP。SEL就是为了查找方法的最终实现IMP。

### IMP

IMP实际上是一个函数指针，指向方法实现的首地址。代表了方法的最终实现。

![](../assets/iosruntime/runtime-8.png)

第一个参数是指向self的指针(如果是实例方法，则是类实例的内存地址；如果是类方法，则是指向元类的指针)，第二个参数是方法选择器(selector)，省略号是方法的参数。

> 每个方法对应唯一的SEL，通过SEL快速准确地获得对应的 IMP，取得IMP后，就获得了执行这个方法代码了。

### Method

Method是用于表示类的方法。

![](../assets/iosruntime/runtime-9.png)

> Method结构体中包含一个SEL和IMP，实际上相当于在SEL和IMP之间作了一个映射。有了SEL，我们便可以找到对应的IMP，从而调用方法的实现代码。

## 四、什么是消息机制

当执行了[receiver message]的时候，相当于向receiver发送一条消息message。runtime会根据reveiver能否处理这条message，从而做出不同的反应。

### 方法（消息机制）的调用流程

消息直到运行时才绑定到方法的实现上。编译器会将消息表达式[receiver message]转化为一个消息函数，即objc_msgSend(receiver, selector)。

![](../assets/iosruntime/runtime-10.png)

objc_msgSend做了如下事情：

> 1. 通过对象的isa指针获取类的结构体。
>
> 2. 在结构体的方法表里查找方法的selector。
>
> 3. 如果没有找到selector，则通过objc_msgSend结构体中指向父类的指针找到父类，并在父类的方法表里查找方法的selector。
>
> 4. 依次会一直找到NSObject。
>
> 5. 一旦找到selector，就会获取到方法实现IMP。
>
> 6. 传入相应的参数来执行方法的具体实现。
>
> 7. 如果最终没有定位到selector，就会走消息转发流程。

### 消息转发机制

以 [receiver message]的方式调用方法，如果receiver无法响应message，编译器会报错。但如果是以performSelector来调用，则需要等到运行时才能确定object是否能接收message消息。如果不能，则程序崩溃。

当我们不能确定一个对象是否能接收某个消息时，会先调用respondsToSelector:来判断一下

![](../assets/iosruntime/runtime-11.png)

如果不使用respondsToSelector:来判断，那么这就可以用到“消息转发”机制。

> 当对象无法接收消息，就会启动消息转发机制，通过这一机制，告诉对象如何处理未知的消息。

这样就可以采取一些措施，让程序执行特定的逻辑，从而避免崩溃。措施分为三个步骤。

#### 1. 动态方法解析

对象接收到未知的消息时，首先会调用所属类的类方法+resolveInstanceMethod:(实例方法)或 者+resolveClassMethod:(类方法)。

在这个方法中，我们有机会为该未知消息新增一个”处理方法”。使用该“处理方法”的前提是已经实现，只需要在运行时通过class_addMethod函数，动态的添加到类里面就可以了。代码如下。

![](../assets/iosruntime/runtime-12.png)

#### 2. 备用接收者

如果在上一步无法处理消息，则Runtime会继续调下面的方法。

![](../assets/iosruntime/runtime-13.png)

如果这个方法返回一个对象，则这个对象会作为消息的新接收者。注意这个对象不能是self自身，否则就是出现无限循环。如果没有指定对象来处理aSelector，则应该 return [super forwardingTargetForSelector:aSelector]。

但是我们只将消息转发到另一个能处理该消息的对象上，无法对消息进行处理，例如操作消息的参数和返回值。

![](../assets/iosruntime/runtime-14.png)

#### 3. 完整消息转发

如果在上一步还是不能处理未知消息，则唯一能做的就是启用完整的消息转发机制。此时会调用以下方法：

![](../assets/iosruntime/runtime-15.png)

这是最后一次机会将消息转发给其它对象。创建一个表示消息的NSInvocation对象，把与消息的有关全部细节封装在anInvocation中，包括selector，目标(target)和参数。在forwardInvocation 方法中将消息转发给其它对象。

forwardInvocation:方法的实现有两个任务：

> a. 定位可以响应封装在anInvocation中的消息的对象。
>
> b. 使用anInvocation作为参数，将消息发送到选中的对象。anInvocation将会保留调用结果，runtime会提取这一结果并发送到消息的原始发送者。

在这个方法中我们可以实现一些更复杂的功能，我们可以对消息的内容进行修改。另外，若发现消息不应由本类处理，则应调用父类的同名方法，以便继承体系中的每个类都有机会处理。

另外，必须重写下面的方法：

![](../assets/iosruntime/runtime-16.png)

消息转发机制从这个方法中获取信息来创建NSInvocation对象。完整的示例如下：

![](../assets/iosruntime/runtime-17.png)

NSObject的forwardInvocation方法只是调用了doesNotRecognizeSelector方法，它不会转发任何消息。如果不在以上所述的三个步骤中处理未知消息，则会引发异常。

forwardInvocation就像一个未知消息的分发中心，将这些未知的消息转发给其它对象。或者也可以像一个运输站一样将所有未知消息都发送给同一个接收对象，取决于具体的实现。

消息的转发机制可以用下图来帮助理解。

![](../assets/iosruntime/runtime-18.png)



# 五、runtime的使用

#### 1. 获取属性列表 

代码如下图，运用class_copyPropertyList方法来获得属性列表，遍历把属性加入数组中，最终返回此数组。其中[selfdictionaryWithProperty:properties[i]] 方法是用来拿到属性的描述，例如copy，readonly，NSString等信息。[Demo](https://github.com/remember17/WHRuntimeDemo) 

![](../assets/iosruntime/runtime-19.png)

#### 2. 获取成员变量列表

代码如下图，运用class_copyIvarList方法来获得变量列表，通过遍历把变量加入到数组中，最终返回此数组。其中[[selfclass]decodeType:ivar_getTypeEncoding(ivars[i])]方法是用来拿到变量的类型，例如char，int，unsigned long等信息。[Demo](https://github.com/remember17/WHRuntimeDemo) 

![](../assets/iosruntime/runtime-20.png)

#### 3. 获取方法列表

代码如下图，通过runtime的class_copyMethodList方法来获取方法列表，通过遍历把方法加入到数组中，最终返回此数组。[Demo](https://github.com/remember17/WHRuntimeDemo) 

![](../assets/iosruntime/runtime-21.png)

#### 4. 获取协议列表

代码如下，运用class_copyProtocolList方法来获得协议列表。[Demo](https://github.com/remember17/WHRuntimeDemo) 

![](../assets/iosruntime/runtime-22.png)

#### 5. 方法交换

交换方法是在method_exchangeImplementations里发生的。[Demo](https://github.com/remember17/WHRuntimeDemo) 。使用Swizzling的过程中要注意两个问题：

> **Swizzling要在+load方法中执行**
>
> 运行时会自动调用每个类的两个方法，+load与+initialize。
>
> +load会在main函数之前调用，并且一定会调用。
>
> +initialize是在第一次调用类方法或实例方法之前被调用，有可能一直不被调用。
>
> 一般使用Swizzling是为了影响全局，所以为了方法交换一定成功，Swizzling要放在+load中执行。

> **Swizzling要在dispatch_once中执行**
>
> Swzzling是为了影响全局，所以只让它执行一次就可以了，所以要放在dispatch_once中。

方法交换的代码如下图。

![](../assets/iosruntime/runtime-23.png)

方法交换有不少应用场景，比如记录页面被点开的次数：只要在UIViewController的分类的+load中交换viewDidAppear方法，在交换的方法中添加记录代码就可以了。

我这里举一个例子，Swizzling的实际应用：

> 代码如下图，结合代码理解。
>
> 当网络加载不到图片时，自动添加占位图片，并且不改变图片的原始调用方法。
>
> 在UIimage分类的+load方法中用dispatch_once_t来进行方法的交换，把系统的imageNamed与自己写的wh_imageNamed进行交换，自己写的wh_imageNamed中已经进行了占位图片的处理。
>
> 在别的地方使用imageNamed来拿图片，实际上已经调用了wh_imageNamed，并且在图片不存在的时候自动放上一张占位图。
>
> 注意！自己写的交换方法中要调用[self wh_imageNamed:@"test”]，需要这样写，不会造成死循环。

![](../assets/iosruntime/runtime-24.png)

#### 6. 添加方法

代码如下，运用runtime的class_addMethod来添加一个方法。[Demo](https://github.com/remember17/WHRuntimeDemo) 

![](../assets/iosruntime/runtime-25.png)

添加方法的运用这里说一下两种情况：

> 前提：接收到未知的消息时，首先会调用所属类的类方法+resolveInstanceMethod:(实例方法)或+resolveClassMethod:(类方法)。
>
> 第一种情况是，根据已知的方法名动态的添加一个方法。
>
> 第二种情况是，直接添加一个方法。
>
> 代码如下图

![](../assets/iosruntime/runtime-26.png)

#### 7. 调用私有方法

由于消息机制，runtime可以通过objc_msgSend来帮我们调用一些私有方法。[Demo](https://github.com/remember17/WHRuntimeDemo) 

![](../assets/iosruntime/runtime-27.png)

使用objc_msgSend需要注意两个问题：

> 需要导入头文件#import <objc/message.h>
>
> 按照下图在Build Settings里设置

![](../assets/iosruntime/runtime-28.png)

#### 8. 为分类添加属性

在分类中属性不会自动生成实例变量和存取方法，但是可以运用runtime的关联对象(Associated Object)来解决这个问题。[Demo](https://github.com/remember17/WHRuntimeDemo) 

![](../assets/iosruntime/runtime-29.png)

使用 objc_getAssociatedObject 和 objc_setAssociatedObject 来做到存取方法，使用关联对象模拟实例变量。下面是两个方法的原型：

![](../assets/iosruntime/runtime-30.png)

方法中的的*@selector(categoryProperty)*就是参数key，使用 @selector(categoryProperty) 作为 key 传入，可以确保 key 的唯一性。

*OBJC_ASSOCIATION_COPY_NONATOMIC* 是属性修饰符。

![](../assets/iosruntime/runtime-31.png)