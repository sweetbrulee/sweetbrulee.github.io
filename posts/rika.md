---
date: 2025-06-01
title: Rika Discord 音乐串流机器人：我的第一个多技术栈旅程
description: 用Python，MongoDB等等的技术栈实现了在 Discord 上串流音乐的机器人
category: Python
tags:
    - python
    - mongodb
    - fastapi
    - ffmpeg
---

> 大二那年的寒假，因为 Discord 并没有一个可以完美满足我需求的音乐播放机器人，所以我变开始着手自己从零开始打造一个，同时也分享给我的朋友玩玩。他们平常也喜欢听点音乐什么的（尤其是十几个朋友在一个群频道一起用这个机器人听令人忍俊不禁的音乐时）。

## 从一个简单的播放命令开始

让我从用户最常用的 `/play` 命令开始。在 `src/commands/music.py` 中，我设计了这个看似简单的函数：

```python
@staticmethod
async def play_impl(
    ctx: discord.ApplicationContext, search, after: int, *, ephemeral: bool
):
    await ctx.defer(ephemeral=ephemeral)

    # 获取视频元数据
    music_video_metadata = await Music.create_video_metadata(
        ctx,
        search,
        ephemeral=ephemeral,
        on_yt_auth_finished=yt_auth_finished_handler,
    )

    # 创建播放控制面板
    view: MusicPlayView = Music.create_control_panel(
        ctx, music_video_metadata, ephemeral
    )

    # 添加到播放队列
    playlist = MusicPlaylist.get(ctx.interaction.guild_id)
    await playlist.add(view, after)
```

这其实并不是我最初的设计理念（最初还没有什么控制面板等等的功能），而是经历了无数次的迭代塑造的结果。

## YouTube 视频解析：yt-dlp 的魔法

让我分享一下 `create_video_metadata` 函数的设计思路。在 `src/backend/services/resolver.py` 中实现了核心逻辑：

```python
async def fetch_playable_metadata(
    user_id: str | None,
    guild_id: str | None,
    prompt: str,
    *,
    update_db_history: bool,
    auth_check: bool,
):
    yield {"message": "正在加載影音内容..."}

    if re.match(URL_REGEX, prompt):
        query = prompt
    else:
        query = f"ytsearch:{prompt}"

    with yt_dlp.YoutubeDL(ydl_options_factory(user_id, auth_check=auth_check)) as ydl:
        info = await asyncio.to_thread(ydl.extract_info, query, False)
```

这里的关键在于 `ydl_options_factory` 函数，它定义了如何获取最佳音视频质量：

```python
def ydl_options_factory(user_id: str | None, *, auth_check: bool):
    return {
        "format": "(b/b*)+(b/b*)",  # 第一个用于可播放音频，第二个用于可下载视频
        "noplaylist": True,
        "verbose": False,
        "quiet": False if dev_mode() else True,
        "playlist_items": "1",
    }
```

那个神秘的 `(b/b*)+(b/b*)` 格式字符串是我经过大量测试后找到的最佳方案。这里有个陷阱：`ba/b` 可能导致均衡器调制错误，而 `bv/b` 可能给出无法在浏览器中查看的 m3u8 链接。这些都是我在无数个深夜调试后发现的坑。

## 播放队列：线程安全的音乐管理

现在让我分享播放队列的设计。在 `src/modules/music/playlist.py` 中，我实现了一个系统：

```python
class MusicPlaylist:
    def __init__(self):
        self._lock = asyncio.Lock()
        self._views: list[MusicPlayView] = []
        self._focused_view: Optional[MusicPlayView] = None

    async def add(self, view: MusicPlayView, index: int):
        async with self._lock:
            if index < 0 or index > len(self._views):
                index = len(self._views)
            self._views.insert(index, view)
```

每个服务器（guild）都有自己的播放队列，通过 `asyncio.Lock()` 确保线程安全。但真正需要划重点的是播放控制逻辑：

```python
async def _play_top_nolock(self, prev_focused_view: MusicPlayView):
    if not self._views:
        return

    # 停止之前的播放
    if prev_focused_view:
        await prev_focused_view.stop()

    # 播放顶部的歌曲
    self._focused_view = self._views[0]
    await self._focused_view.play()
```

这种设计允许无缝 "来回地" 切换歌曲，而不会出现音频重叠的问题，并且保持原播放进度。这是我花了整整一个周末才解决的难题，其实现的杂乱程度不得不让我开始重新思考学习 Clean Architecture 的重要性 😭。

## 音频处理：FFmpeg 的艺术

让我分享一下音频处理部分的设计。在 `src/modules/music/play_view.py` 中，我构建了这个复杂的 FFmpeg 命令：

```python
async def compute_ffmpeg_audio(
    self, delta: float = 0.0, base: Optional[float] = None
):
    # 均衡器设置
    eq_options_dict = {
        "reset": "",
        "earrape": "acrusher=bits=2:samples=5:mode=lin:aa=0,",
        "xlow": "equalizer=f=60:t=q:w=1:g=10,",
        "low": "equalizer=f=120:t=q:w=1:g=6,",
        "highpass": "highpass=f=2000,",
        "lowpass": "lowpass=f=150,",
        "custom": "",
    }

    eq_options = eq_options_dict.get(self.eq, "")
    normalizer_options = "dynaudnorm"  # 动态音频标准化
    pitch_options = "atempo=1.0"

    # 构建完整的 FFmpeg 命令
    ffmpeg_options = f"{eq_options}{normalizer_options},{pitch_options}"
```

这里使用了 FFmpeg 的多个高级滤镜：

- `acrusher`: 音频位深度压缩，用于"earrape"的搞怪效果
- `equalizer`: 参数化均衡器，可以精确调整特定频率
- `dynaudnorm`: 动态音频标准化，自动调整音量
- `atempo`: 时间拉伸，用于调整播放速度

## 智能峰值检测：机器学习的应用

这个环节最让我兴奋了。~~在 ChatGPT 呕心沥血的教导下，~~在 `src/backend/services/playablemetadata/heatmap/peaks.py` 中，我实现了一个基于统计学和高斯混合模型的峰值检测算法：

```python
def find_outstanding_peaks_std(
    objects: list, key: Callable[[Any], float | int] = lambda x: x, threshold=1.0
):
    if len(objects) == 0:
        return [], []

    # 1. 提取指定属性的值
    values = np.array([key(obj) for obj in objects])

    # 2. 找出局部峰值
    peaks, _ = signal.find_peaks(values)
    peak_values = values[peaks]

    # 3. 计算平均值和标准差
    mean_value = np.mean(peak_values)
    std_dev = np.std(peak_values)

    # 4. 标准差筛选：找到 outstanding 的峰值索引
    outstanding_idx = [
        i for i, v in enumerate(peak_values) if (v - mean_value) > threshold * std_dev
    ]

    return outstanding_peaks_idx, outstanding_peaks
```

更进一步，我还实现了基于 BIC（贝叶斯信息准则）的高斯混合模型聚类：

```python
def gmm_bic_cluster(objects: list, key: Callable[[Any], float | int] = lambda x: x):
    if len(objects) <= 1:
        return [[0]], [], [0]

    # 1. 提取数据并转换为二维
    values = np.array([key(obj) for obj in objects])
    X = values.reshape(-1, 1)

    # 2. 使用BIC选择最佳聚类数量
    lowest_bic = np.inf
    best_gmm = None
    n_components_range = range(1, len(objects) + 1)
    bic_scores = []

    for n_components in n_components_range:
        gmm = GaussianMixture(n_components=n_components)
        gmm.fit(X)
        bic = gmm.bic(X)
        bic_scores.append(bic)

        if bic < lowest_bic:
            lowest_bic = bic
            best_gmm = gmm

    # 3. 拟合最佳GMM模型并返回聚类结果
    labels = best_gmm.predict(X)
    clusters = [[] for _ in range(best_gmm.n_components)]
    for idx, label in enumerate(labels):
        clusters[label].append(idx)

    return clusters, bic_scores, labels
```

这个算法可以自动识别音频中的重要片段，比如歌曲的高潮部分（也就是 YouTube 中的最多播放次数的片段），听音乐的人便可以一键跳转到最想听的地方。

## 异步编程的挑战

在整个代码库中，我大量使用了异步编程。但异步编程也带来了挑战。在 `src/modules/music/timer.py` 中，我记录了一个关于播放中断的问题：

```python
# TODO: 播放音乐最后差不多 5 秒钟就会直接跳下一首，正常来说应该完整播完
# (目前暂时把 tick timer 改成 1s 来解决，但治标不治本, 而且可能也没真的解决问题)。
```

这个问题的根本原因可能是音频流的缓冲机制和定时器精度之间的不匹配。当使用较短的 tick timer（比如 1 秒）时，虽然可以更频繁地检查播放状态，但也会增加 CPU 负载。

## 数据库设计：MongoDB 的灵活应用

让我分享一下数据库设计的思路。在 `src/backend/crud/playable.py` 中，我设计了查询模式：

```python
def read_playable_history(user_id: str, guild_id: str, *, keywords: str, limit: int):
    # 构建一个匹配任意单词顺序的正则表达式
    words = re.split(r"\s+", keywords.strip())
    words = list(map(_escape_regex, words))
    patterns = [f"(?=.*{word})" for word in words]
    pattern = "".join(patterns)

    return db_async["music"].aggregate([
        {"$match": {"user": user_id, "guild": guild_id}},
        {"$match": {"name": {"$regex": pattern, "$options": "i"}}},
        {"$sort": {"create_time": -1}},
        {"$limit": limit}
    ])
```

这里使用了 `(?=.*word)` 来实现关键词的无序匹配，让用户可以输入任意顺序的关键词来搜索历史记录。

## 结语

其实这个机器人让我最感动的不是它的代码，而是它陪伴了许多人度过了无数个欢快的夜晚。

我们也许会在某一天相见的，Rika🫂。

> 目前 Rika 只开源了部分源代码 https://github.com/sweetbrulee/rika ，以上内容均未完整开源。
