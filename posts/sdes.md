---
date: 2023-12-10
title: Sdes示例代码
description: 使用Python实现了一个简单的sdes加解密算法代码，随便玩玩
category: Cyber Security
tags:
    - python
    - cryptography
---

# 示例代码

```python
P10 = "3 5 2 7 4 10 1 9 8 6"
P8 = "6 3 7 4 8 5 10 9"
LS1L = "2 3 4 5 1"
LS1R = "7 8 9 10 6"
LS2L = "3 4 5 1 2"
LS2R = "8 9 10 6 7"

EP = "4 1 2 3 2 3 4 1"
IP = "2 6 3 1 4 8 5 7"
IPinv = "4 1 3 5 7 2 8 6"
P4 = "2 4 3 1"

SW = "5 6 7 8 1 2 3 4"


def XOR(a: str, b: str) -> str:
    return "".join("1" if a[i] != b[i] else "0" for i in range(len(a)))


def S0(bits4: str) -> str:
    row = int(bits4[0] + bits4[3], 2)
    col = int(bits4[1] + bits4[2], 2)
    return [
        ["01", "00", "11", "10"],
        ["11", "10", "01", "00"],
        ["00", "10", "01", "11"],
        ["11", "01", "11", "10"],
    ][row][col]


def S1(bits4: str) -> str:
    row = int(bits4[0] + bits4[3], 2)
    col = int(bits4[1] + bits4[2], 2)
    return [
        ["00", "01", "10", "11"],
        ["10", "00", "01", "11"],
        ["11", "00", "01", "00"],
        ["10", "01", "00", "11"],
    ][row][col]


def act(permutates: [], bits: str, cobits: str = None) -> str:
    ret = ""
    temp = bits
    for permutate in permutates:
        if hasattr(permutate, "__call__"):  # if it is a function
            ret = permutate(temp, cobits) if cobits else permutate(temp)
        else:
            ret = "".join(temp[int(i) - 1] for i in permutate.split())
        temp = ret
    return ret


def generate(key10: str) -> (str, str):
    s1 = act([P10, LS1L], key10) + act([P10, LS1R], key10)
    k1 = act([P8], s1)
    s2 = act([LS2L], s1) + act([LS2R], s1)
    k2 = act([P8], s2)
    return k1, k2


def FK(plain8: str, key8: str) -> str:
    plain4l = plain8[:4]
    plain4r = plain8[4:]
    epxor = act([EP, XOR], plain4r, key8)
    s0 = act([S0], epxor[:4])
    s1 = act([S1], epxor[4:])
    p4 = act([P4], s0 + s1)
    final_xor = act([XOR], plain4l, p4)
    return final_xor + plain4r


def encrypt(plain8: str, key10: str) -> str:
    key8_1, key8_2 = generate(key10)
    ip = act([IP], plain8)
    fk1sw = act([FK, SW], ip, key8_1)
    fk2 = act([FK], fk1sw, key8_2)
    return act([IPinv], fk2)


def decrypt(cipher8: str, key10: str) -> str:
    key8_1, key8_2 = generate(key10)
    ip = act([IP], cipher8)
    fk1sw = act([FK, SW], ip, key8_2)
    fk2 = act([FK], fk1sw, key8_1)
    return act([IPinv], fk2)


key10 = "1010000010"
plain8 = "01110010"

cipher8 = encrypt(plain8, key10)
print("Encryption: " + cipher8)
print("Decryption: " + decrypt(cipher8, key10))


# key default: 10100 00010

```
